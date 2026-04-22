(async function () {
	const sectionsEl = document.getElementById("benchmark-sections");
	const tocEl = document.getElementById("benchmark-toc");
	if (!sectionsEl || !tocEl) return;

	initializePerPageInput();

	const status = document.querySelector(".grid-status");
	const setStatus = text => {
		if (status) status.innerText = text;
	};

	const dataCenter = new DataCenter();
	await dataCenter.initialize();

	function slugify(s) {
		return s.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
	}

	function createSection(groupId, groupLabel) {
		const section = document.createElement("section");
		section.classList.add("benchmark-group");
		section.id = `group-${groupId}`;

		const title = document.createElement("h2");
		title.classList.add("benchmark-group-title");
		const labelSpan = document.createElement("span");
		labelSpan.innerText = groupLabel;
		const countSpan = document.createElement("span");
		countSpan.classList.add("benchmark-group-count");
		title.appendChild(labelSpan);
		title.appendChild(countSpan);

		const grid = document.createElement("div");
		grid.classList.add("chart-grid");

		section.appendChild(title);
		section.appendChild(grid);
		sectionsEl.appendChild(section);

		return { section, grid, countSpan };
	}

	function createCell(grid, titleText, axis) {
		const cell = document.createElement("div");
		cell.classList.add("chart-cell");
		if (axis) cell.dataset.axis = axis;

		const title = document.createElement("div");
		title.classList.add("chart-cell-title");
		title.innerText = titleText;

		const wrap = document.createElement("div");
		wrap.classList.add("chart-cell-canvas");
		const canvas = document.createElement("canvas");
		wrap.appendChild(canvas);

		cell.appendChild(title);
		cell.appendChild(wrap);
		grid.appendChild(cell);

		return { canvas };
	}

	const axisColors = {
		time: { border: "#1677ff", fill: "rgba(22, 119, 255, 0.12)" },
		size: { border: "#fa8c16", fill: "rgba(250, 140, 22, 0.14)" },
		ratio: { border: "#722ed1", fill: "rgba(114, 46, 209, 0.14)" },
	};

	function buildConfig(tag, points) {
		const axis = getAxisType(tag);
		const values = points.map(p => p.y);
		const minVal = values.length ? Math.min(...values) : undefined;
		const formatter = axis === "size" ? formatSize : axis === "ratio" ? formatRatio : formatTime;
		const { border, fill } = axisColors[axis] || axisColors.time;

		return {
			type: "line",
			data: {
				datasets: [
					{
						label: tag,
						data: points,
						yAxisID: axis,
						fill: true,
						borderColor: border,
						backgroundColor: fill,
						pointRadius: 1.5,
						pointHoverRadius: 4,
						borderWidth: 1.5,
					},
				],
			},
			options: {
				maintainAspectRatio: false,
				responsive: true,
				animation: false,
				onClick(event, activeElements) {
					if (activeElements.length === 0) return;
					const { datasetIndex, index } = activeElements[0];
					const raw = this.data.datasets[datasetIndex].data[index];
					if (raw.url) window.open(raw.url, "_blank");
				},
				scales: {
					x: { ticks: { display: false, autoSkip: false }, grid: { display: false } },
					[axis]: {
						type: "linear",
						position: "left",
						beginAtZero: false,
						min: values.length ? getNiceMin(minVal) : undefined,
						ticks: {
							callback(value, _, vs) {
								const max = vs[vs.length - 1].value;
								return formatter(value, max);
							},
							maxTicksLimit: 4,
							font: { size: 10 },
						},
					},
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							title() {
								return null;
							},
							label(ctx) {
								const v = ctx.raw.y;
								const text = formatter(v, v);
								const ds = ctx.dataset.data;
								const i = ctx.dataIndex;
								let delta = "";
								if (i > 0) {
									const pv = ds[i - 1].y;
									const d = ((v - pv) / pv) * 100;
									const sign = d >= 0 ? "+" : "";
									delta = ` (${sign}${d.toFixed(2)}%)`;
								}
								return [`${text}${delta}`, ctx.raw.description || ""];
							},
						},
					},
				},
			},
		};
	}

	function extractSeries(benchmarkName, metric) {
		const cached = dataCenter.cache[benchmarkName];
		if (!cached) return [];
		return cached
			.map(({ file, ...rest }) => {
				if (typeof file[metric] === "number") return { value: file[metric], ...rest };
				if (file[metric]?.median === undefined) return null;
				return { value: file[metric].median, ...rest };
			})
			.filter(Boolean);
	}

	// Warm cache once per unique benchmark. Done in one fetchChartData call
	// with distinct benchmarkNames — avoids the cache-miss race that would
	// fire if we submitted many tags sharing a benchmarkName in parallel.
	const benchmarksToWarm = [...allBenchmarkNames, "rspack-build"];
	setStatus(`Fetching ${benchmarksToWarm.length} benchmarks × ${dataCenter.commits.length} commits…`);
	await dataCenter.fetchChartData(benchmarksToWarm.map(n => `${n} + __warm__`));

	// Group spec — each group owns its own section + grid, skipped when empty.
	const groups = [
		{
			id: "binary-size",
			label: "Binary Size",
			specs: [
				{ tag: "rspack-build + size", label: "ci size" },
				{ tag: "rspack-build + releaseSize", label: "release size" },
			],
		},
		...allBenchmarkNames.map(name => ({
			id: slugify(name),
			label: name,
			specs: metrics.map(m => ({ tag: `${name} + ${m}`, label: m })),
		})),
	];

	// Build ToC links upfront so users can see the full list before rendering finishes.
	const tocItems = {};
	for (const g of groups) {
		const a = document.createElement("a");
		a.href = `#group-${g.id}`;
		a.innerText = g.label;
		a.style.display = "none";
		tocEl.appendChild(a);
		tocItems[g.id] = a;
	}

	let rendered = 0;
	let emptyGroups = 0;

	for (const g of groups) {
		const { section, grid, countSpan } = createSection(g.id, g.label);
		let groupCount = 0;

		for (const { tag, label } of g.specs) {
			const [name, metric] = tag.split(" + ");
			const series = extractSeries(name, metric);
			if (series.length === 0) continue;

			const points = series.map(({ labelX, value, url, description }) => ({
				x: labelX,
				y: value,
				url,
				description,
			}));
			const { canvas } = createCell(grid, label, getAxisType(tag));
			new Chart(canvas, buildConfig(tag, points));
			rendered++;
			groupCount++;

			if (rendered % 50 === 0) {
				setStatus(`Rendered ${rendered} charts across ${groups.length} groups…`);
				await new Promise(r => setTimeout(r, 0));
			}
		}

		if (groupCount === 0) {
			section.remove();
			emptyGroups++;
		} else {
			countSpan.innerText = `${groupCount} metric${groupCount === 1 ? "" : "s"}`;
			tocItems[g.id].style.display = "";
		}
	}

	setStatus(
		`Rendered ${rendered} charts across ${groups.length - emptyGroups} groups.`
	);
})();
