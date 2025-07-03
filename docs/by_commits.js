// `10000_development-mode_hmr` is benchmark name
// `stats` is metric
// `10000_development-mode_hmr + stats` is tag

const getFetchPrefix = () => {
	if (location.host === "rspack-ecosystem-benchmark.rspack.dev") {
		return "https://rspack-ecosystem-benchmark-data.rspack.dev";
	}
	if (location.host === "ecosystem-benchmark.rspack.rs") {
		return "https://ecosystem-benchmark-data.rspack.rs";
	}
	return "https://raw.githubusercontent.com/web-infra-dev/rspack-ecosystem-benchmark/data";
};

const fetchPrefix = getFetchPrefix();

const formatTime = (value, maxValue) => {
	if (maxValue > 10000) return `${value / 1000} s`;
	return `${value} ms`;
};

const formatSize = (value, maxValue) => {
	if (maxValue > 1000000) return `${(value / 1000000).toFixed(2)} MB`;
	if (maxValue > 1000) return `${(value / 1000).toFixed(2)} KB`;
	return `${value} B`;
};

const formatRatio = (value, maxValue) => {
	return `${value}%`;
};
const debounce = (fn, t) => {
	let timer = null;
	return function (...args) {
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => fn(...args), t);
	};
};
const getAxisType = tag => {
	if (tag === "rspack-build") return "size";

	if (tag.endsWith(" size") || tag.endsWith(" memory")) {
		return "size";
	} else if (tag.endsWith(" cache")) {
		return "ratio";
	} else {
		return "time";
	}
};
const allBenchmarkNames = [
	"10000_development-mode",
	"10000_development-mode_hmr",
	"10000_production-mode",
	"10000_big_production-mode",
	"10000_big_production-mode_disable-minimize",
	"10000_production-mode_builtin-swc-loader",
	"10000_production-mode_persistent-cold",
	"10000_production-mode_persistent-hot",
	"arco-pro_development-mode",
	"arco-pro_development-mode_hmr",
	"arco-pro_development-mode_hmr_intercept-plugin",
	"arco-pro_development-mode_intercept-plugin",
	"arco-pro_production-mode",
	"arco-pro_production-mode_generate-package-json-webpack-plugin",
	"arco-pro_production-mode_intercept-plugin",
	"arco-pro_production-mode_persistent-cold",
	"arco-pro_production-mode_persistent-hot",
	"arco-pro_production-mode_traverse-chunk-modules",
	"large-dyn-imports_development-mode",
	"large-dyn-imports_production-mode",
	"threejs_development-mode_10x",
	"threejs_development-mode_10x_hmr",
	"threejs_production-mode_10x",
	"threejs_production-mode_10x_persistent-cold",
	"threejs_production-mode_10x_persistent-hot",
	"threejs_production-mode_builtin-swc-loader_10x"
];

const metrics = [
	"stats",
	"Compilation.after process assets",
	"Compilation.after seal",
	"Compilation.chunk ids",
	"Compilation.code generation",
	"Compilation.create chunk assets",
	"Compilation.create chunks",
	"Compilation.create module assets",
	"Compilation.finish modules",
	"Compilation.hashing",
	"Compilation.hashing: hash chunks",
	"Compilation.hashing: hash runtime chunks",
	"Compilation.hashing: process full hash chunks",
	"Compilation.module code generation cache",
	"Compilation.module ids",
	"Compilation.optimize",
	"Compilation.optimize code generation",
	"Compilation.optimize dependencies",
	"Compilation.process assets",
	"Compilation.runtime requirements",
	"Compilation.runtime requirements.chunks",
	"Compilation.runtime requirements.entries",
	"Compilation.runtime requirements.modules",
	"Compiler.emitAssets",
	"Compiler.finish compilation",
	"Compiler.finish make hook",
	"Compiler.make",
	"Compiler.make hook",
	"Compiler.seal compilation",
	"EnsureChunkConditionsPlugin.ensure chunk conditions",
	"RemoveEmptyChunksPlugin.remove empty chunks",
	"SideEffectsFlagPlugin.do optimize connections",
	"SideEffectsFlagPlugin.find optimizable connections",
	"SideEffectsFlagPlugin.prepare connections",
	"SideEffectsFlagPlugin.update connections",
	"SourceMapDevToolPlugin.collect source maps",
	"SourceMapDevToolPlugin.emit source map assets",
	"SplitChunksPlugin.ensure max size fit",
	"SplitChunksPlugin.ensure min size fit",
	"SplitChunksPlugin.prepare module group map",
	"SplitChunksPlugin.process module group map",
	"array buffers memory",
	"buildChunkGraph.extend chunkGroup runtime",
	"buildChunkGraph.prepare entrypoints",
	"buildChunkGraph.process queue",
	"dist size",
	"exec",
	"external memory",
	"heap memory",
	"rss memory"
];

class DataCenter {
	constructor() {
		// benchmark name to date array
		// Record<BenchmarkName, DateString[]>
		this.index = {};
		this.metrics = [];
		this.dateRange = [];
		// cache benchmark name to file data
		// Record<BenchmarkName, Array<{ date: DateString, file: FileData }>>
		this.cache = {};
		this.buildInfo = {};
		this.commits = [];

		if (!localStorage.getItem("GITHUB_TOKEN")) {
			showGithubTokenModal();
			throw new Error("GitHub Token not provided yet.");
		}

		this.githubToken = localStorage.getItem("GITHUB_TOKEN");
	}

	// fetch index and latest data
	async initialize() {
		const queryParams = new URLSearchParams(window.location.search);
		const perPage = parseInt(queryParams.get("per_page") || "50", 10) || 50;

		const commits = await fetch(
			`https://api.github.com/repos/web-infra-dev/rspack/commits?per_page=${perPage}`,
			{
				headers: {
					Authorization: `Bearer ${this.githubToken}`
				}
			}
		).then(res => res.json());

		this.commits = commits
			.map(({ sha, html_url, commit: { message, author } }) => ({
				sha,
				url: html_url,
				message,
				author
			}))
			.reverse();

		this.metrics = metrics;
	}

	async fetchChartData(tags) {
		const res = {};
		await Promise.all(
			tags.map(async tag => {
				const [benchmarkName, metric] = tag.split(" + ");
				if (!this.cache[benchmarkName]) {
					this.cache[benchmarkName] = await Promise.all(
						this.commits.map(({ sha, author, url, message }) => {
							let description = `${message.split("\n")[0].trim()} by @${
								author.name
							}`;
							let date = moment(author.date).format("YYYY-MM-DD");
							let labelX = `${sha.slice(0, 7)}:${date}`;

							return fetch(
								`${fetchPrefix}/commits/${sha.slice(0, 2)}/${sha.slice(
									2
								)}/${benchmarkName}.json`
							)
								.then(
									res => res.json(),
									() => ({})
								)
								.then(
									file => {
										return { sha, file, url, description, labelX };
									},
									() => {
										return { sha, file: {}, url, description, labelX };
									}
								);
						})
					);
				}

				res[tag] = this.cache[benchmarkName]
					.map(({ file, ...rest }) => {
						if (typeof file[metric] === "number") {
							return {
								value: file[metric],
								...rest
							};
						}

						if (file[metric]?.median === undefined) {
							return null;
						}
						return {
							value: file[metric].median,
							...rest
						};
					})
					.filter(item => !!item);
			})
		);

		return res;
	}
}

function initializeAddAction(cases, metrics, hasTag, addTag) {
	const container = document.querySelector(".action-container");

	const benchmarkNameSelect = container.querySelector("select.benchmark-name");
	while (benchmarkNameSelect.hasChildNodes()) {
		benchmarkNameSelect.removeChild(benchmarkNameSelect.firstChild);
	}
	for (const name of cases) {
		const option = document.createElement("option");
		option.innerText = name;
		option.value = name;
		benchmarkNameSelect.appendChild(option);
	}

	const metricSelect = container.querySelector("select.metric");
	while (metricSelect.hasChildNodes()) {
		metricSelect.removeChild(metricSelect.firstChild);
	}
	for (const name of metrics) {
		const option = document.createElement("option");
		option.innerText = name;
		option.value = name;
		metricSelect.appendChild(option);
	}

	function getTagName() {
		return `${benchmarkNameSelect.value} + ${metricSelect.value}`;
	}

	const addButton = container.querySelector(".add");

	function updateAddButton() {
		if (hasTag(getTagName())) {
			addButton.classList.add("disable");
		} else {
			addButton.classList.remove("disable");
		}
	}

	benchmarkNameSelect.addEventListener("change", updateAddButton);
	metricSelect.addEventListener("change", updateAddButton);
	addButton.addEventListener("click", function () {
		addTag(getTagName());
		updateAddButton();
	});

	updateAddButton();
	if (!addButton.classList.contains("disable")) {
		addButton.click();
	}
}

class TagCtrl {
	constructor() {
		this.container = document.querySelector(".tag-container");
		this.changeListener = [];
	}

	has(tag) {
		return !!this.container.querySelector(`.tag[data-name="${tag}"]`);
	}

	add(tag) {
		if (this.has(tag)) {
			return;
		}

		const tagDom = document.createElement("label");
		tagDom.classList.add("tag", "active");
		tagDom.dataset.name = tag;
		const nameDom = document.createElement("span");
		nameDom.classList.add("name");
		nameDom.innerText = tag;
		const closeDom = document.createElement("span");
		closeDom.classList.add("close");
		tagDom.appendChild(nameDom);
		tagDom.appendChild(closeDom);
		this.container.append(tagDom);
		tagDom.addEventListener("click", e => {
			if (e.target === closeDom) {
				tagDom.remove();
				this.dispatchChangeListener();
				return;
			}
			tagDom.classList.toggle("active");
			this.dispatchChangeListener();
		});

		this.dispatchChangeListener();
	}

	addChangeListener(listener) {
		this.changeListener.push(listener);
	}

	removeChangeListener(listener) {
		this.changeListener = this.changeListener.filter(item => item !== listener);
	}

	dispatchChangeListener() {
		const tags = [];
		for (const tag of this.container.querySelectorAll(".tag.active")) {
			tags.push(tag.dataset.name);
		}
		for (const item of this.changeListener) {
			item(tags);
		}
	}
}

function getNiceMin(min, percent = 0.1) {
	const adjusted = min - Math.abs(min * percent);
	const magnitude = Math.pow(10, Math.floor(Math.log10(adjusted)));
	const step = magnitude / 10;
	return Math.floor(adjusted / step) * step;
}

class BenchmarkChart {
	constructor(dataCenter, selector) {
		this.dataCenter = dataCenter;
		this.chart = new Chart(document.querySelector(selector), {
			type: "line",
			data: {
				datasets: []
			},
			options: {
				onClick(event, activeElements) {
					if (activeElements.length === 0) {
						return;
					}
					const { datasetIndex, index } = activeElements[0];
					const data = this.data.datasets[datasetIndex].data[index];

					if (data.url) {
						window.open(data.url, "_blank");
					}
				},
				scales: {
					x: {
						ticks: {
							autoSkip: false
						}
					},
					time: {
						type: "linear",
						display: false,
						position: "left",
						beginAtZero: true,
						ticks: {
							callback(value, _, values) {
								return formatTime(value, values[values.length - 1].value);
							}
						}
					},
					size: {
						type: "linear",
						display: false,
						position: "right",
						beginAtZero: true,
						ticks: {
							callback(value, _, values) {
								return formatSize(value, values[values.length - 1].value);
							}
						}
					},
					ratio: {
						type: "linear",
						display: false,
						position: "right",
						beginAtZero: true,
						ticks: {
							callback(value, _, values) {
								return formatRatio(value, values[values.length - 1].value);
							}
						}
					}
				},
				plugins: {
					legend: {
						// ignore click event
						onClick: function () {}
					},
					tooltip: {
						callbacks: {
							title() {
								return null;
							},
							label(context) {
								const dataset = context.dataset.data;
								const index = context.dataIndex;
								const axis = context.dataset.yAxisID;

								const value = context.raw.y;
								const text =
									context.dataset.yAxisID === "size"
										? formatSize(value, value)
										: context.dataset.yAxisID === "ratio"
										? formatRatio(value, value)
										: formatTime(value, value);

								let deltaText = "";
								if (index > 0) {
									const prevValue = dataset[index - 1].y;
									const delta = ((value - prevValue) / prevValue) * 100;
									const sign = delta >= 0 ? "+" : "";
									deltaText = ` (${sign}${delta.toFixed(2)}%)`;
								}

								return [
									`${context.dataset.label}: ${text}${deltaText}`,
									`${context.raw.description}`
								];
							}
						}
					}
				}
			}
		});
	}

	/**
	 * update chart with new data
	 * @param {string[]} tags
	 */
	async updateChartData(tags) {
		const data = await this.dataCenter.fetchChartData(tags);

		let showTimeAxis = false;
		let showSizeAxis = false;
		let showRatioAxis = false;
		const datasets = [];
		const axisValues = {
			time: [],
			size: [],
			ratio: []
		};

		for (const tag of Object.keys(data)) {
			const values = data[tag];
			const axis = getAxisType(tag);
			showTimeAxis = showTimeAxis || axis === "time";
			showSizeAxis = showSizeAxis || axis === "size";
			showRatioAxis = showRatioAxis || axis === "ratio";
			datasets.push({
				label: tag,
				data: values
					.filter(v => v.value !== null)
					.map(({ sha, labelX, value, url, description }) => {
						axisValues[axis].push(value);
						return {
							x: labelX,
							y: value,
							url,
							description
						};
					}),
				yAxisID: axis,
				fill: true
			});
			// this.chart.data.labels = values.map(v=>v.sha.slice(0,7))
		}

		this.chart.data.datasets = datasets;
		this.chart.options.scales.time.display = showTimeAxis;
		this.chart.options.scales.size.display = showSizeAxis;
		this.chart.options.scales.ratio.display = showRatioAxis;

		if (showTimeAxis && axisValues.time.length) {
			const min = Math.min(...axisValues.time);
			this.chart.options.scales.time.min = getNiceMin(min);
		}
		if (showSizeAxis && axisValues.size.length) {
			const min = Math.min(...axisValues.size);
			this.chart.options.scales.size.min = getNiceMin(min);
		}
		if (showRatioAxis && axisValues.ratio.length) {
			const min = Math.min(...axisValues.ratio);
			this.chart.options.scales.ratio.min = getNiceMin(min);
		}

		this.chart.update();
	}
}

function showGithubTokenModal() {
	const modal = document.createElement("div");
	modal.innerHTML = `
		<div id="github-token-modal-overlay" style="
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.5);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 10000;
		">
			<div style="
				background: white;
				padding: 24px;
				border-radius: 12px;
				width: 400px;
				box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
				font-family: sans-serif;
			">
				<h2 style="margin-top: 0;">GitHub Token 需要授权</h2>
				<p style="font-size: 14px; color: #444;">
					为了从 GitHub 加载 commit 信息，请提供一个 <strong>read-only</strong> GitHub Token。你可以在
					<a href="https://github.com/settings/tokens" target="_blank">GitHub Settings</a> 创建一个无需权限的 token。
				</p>
				<input id="github-token-input" type="password" placeholder="粘贴你的 GitHub Token" style="
					width: 100%;
					padding: 8px;
					font-size: 14px;
					margin-top: 8px;
					box-sizing: border-box;
				"/>
				<div style="text-align: right; margin-top: 16px;">
					<button id="github-token-submit" style="
						background: #2c974b;
						color: white;
						border: none;
						padding: 8px 16px;
						border-radius: 6px;
						cursor: pointer;
					">确认</button>
				</div>
			</div>
		</div>
	`;
	document.body.appendChild(modal);

	document
		.getElementById("github-token-submit")
		.addEventListener("click", () => {
			const token = document.getElementById("github-token-input").value.trim();
			if (token) {
				localStorage.setItem("GITHUB_TOKEN", token);
				location.reload();
			} else {
				alert("Token 不能为空");
			}
		});
}

(async function () {
	const dataCenter = new DataCenter();
	await dataCenter.initialize();

	const chart = new BenchmarkChart(dataCenter, "#perf-chart");

	const tagCtrl = new TagCtrl();
	tagCtrl.addChangeListener(async function (tags) {
		chart.updateChartData(tags);
	});

	initializeAddAction(
		allBenchmarkNames,
		dataCenter.metrics,
		tagCtrl.has.bind(tagCtrl),
		tagCtrl.add.bind(tagCtrl)
	);

	let tag = "rspack-build + size";
	await dataCenter.fetchChartData(["rspack-build + size"]);
	const sizeChart = new BenchmarkChart(dataCenter, "#size-chart");
	await sizeChart.updateChartData(["rspack-build + size"]);

	let data = sizeChart.chart.data.datasets[0].data.map(({ y }) => y);
	let max = Math.max.apply(Math, data);
	let min = Math.min.apply(Math, data);

	sizeChart.chart.options.scales.size.min = min * 0.999;
	sizeChart.chart.options.scales.size.max = max * 1.001;
	sizeChart.chart.update();
})();
