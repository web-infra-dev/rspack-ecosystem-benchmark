// `10000_development-mode_hmr` is benchmark name
// `stats` is metric
// `10000_development-mode_hmr + stats` is tag

const fetchPrefix =
	"https://raw.githubusercontent.com/web-infra-dev/rspack-ecosystem-benchmark/data";
const formatTime = (value, maxValue) => {
	if (maxValue > 10000) return `${value / 1000} s`;
	return `${value} ms`;
};
const formatSize = (value, maxValue) => {
	if (maxValue > 10000000) return `${value / 1000000} MB`;
	if (maxValue > 10000) return `${value / 1000} kB`;
	return `${value} B`;
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
	}
	// fetch index and latest data
	async initialize() {
		const index = {};
		const indexFile = await (await fetch(`${fetchPrefix}/index.txt`)).text();
		const lines = indexFile.split("\n").filter(item => !!item);
		const BeginDate = lines[0].split("/")[0];
		const endDate = lines[lines.length - 1].split("/")[0];

		// generate index struct
		for (const line of lines) {
			const [_, date, benchmarkName] = line.match(/^(.+)\/(.+).json$/);
			index[benchmarkName] = index[benchmarkName] || [];
			index[benchmarkName].push(date);
		}
		for (const dates of Object.values(index)) {
			dates.sort();
		}
		this.index = index;

		// generate metrics struct
		const latestData = await (
			await fetch(`${fetchPrefix}/${lines.pop()}`)
		).json();
		this.metrics = Object.keys(latestData);

		// set date range
		this.dateRange = [+new Date(BeginDate), +new Date(endDate)];
	}

	async fetchChartData(tags) {
		const res = {};
		await Promise.all(
			tags.map(async tag => {
				const [benchmarkName, metric] = tag.split(" + ");
				if (!this.cache[benchmarkName]) {
					this.cache[benchmarkName] = await Promise.all(
						this.index[benchmarkName].map(async date => {
							const file = await (
								await fetch(`${fetchPrefix}/${date}/${benchmarkName}.json`)
							).json();
							return { date, file };
						})
					);
				}

				res[tag] = this.cache[benchmarkName]
					.map(({ date, file }) => {
						if (file[metric]?.median === undefined) {
							return null;
						}
						return {
							date,
							value: file[metric].median
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

class BenchmarkChart {
	constructor() {
		this.chart = new Chart(document.querySelector(".chart-container canvas"), {
			type: "line",
			data: {
				datasets: []
			},
			options: {
				scales: {
					x: {
						type: "time",
						time: {
							unit: "day"
						},
						ticks: {
							callback(v) {
								return moment(v).format("YYYY-MM-DD");
							}
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
					}
				},
				plugins: {
					legend: {
						// ignore click event
						onClick: function () {}
					},
					tooltip: {
						callbacks: {
							title(context) {
								return context[0].raw.x;
							},
							label(context) {
								const value = context.raw.y;
								const text =
									context.dataset.yAxisID === "size"
										? formatSize(value, value)
										: formatTime(value, value);
								return `${context.dataset.label}: ${text}`;
							}
						}
					}
				}
			}
		});
	}

	/**
	 * update chart with new data
	 * @param {Record<Tag, Array<{ date: DateString, value: number }>>} data
	 */
	updateChartData(data) {
		let showTimeAxis = false;
		let showSizeAxis = false;
		const datasets = [];
		for (const tag of Object.keys(data)) {
			const values = data[tag];
			const isSizeAxis = tag.endsWith(" size") || tag.endsWith(" memory");
			if (isSizeAxis) {
				showSizeAxis = true;
			} else {
				showTimeAxis = true;
			}
			datasets.push({
				label: tag,
				data: values.map(({ date, value }) => {
					return {
						x: date,
						y: value
					};
				}),
				yAxisID: isSizeAxis ? "size" : "time",
				fill: true
			});
		}
		this.chart.data.datasets = datasets;
		this.chart.options.scales.time.display = showTimeAxis;
		this.chart.options.scales.size.display = showSizeAxis;
		this.chart.update();
	}

	updateChartAxis(min, max) {
		this.chart.options.scales.x.min = min;
		this.chart.options.scales.x.max = max;
		this.chart.update();
	}
}

function initializeSlider(onChange) {
	const container = document.querySelector(".slider");
	const marks = container.querySelectorAll(".mark");
	const markDom1 = marks[0];
	const markDom2 = marks[1];
	const activeLineDom = container.querySelector(".active-line");
	const debounceChange = debounce(onChange, 200);
	const updateMarkPos = function () {
		const l1 = parseInt(activeLineDom.style.left);
		const l2 = l1 + parseInt(activeLineDom.style.width);
		markDom1.style.left = l1 + "%";
		markDom2.style.left = l2 + "%";
		debounceChange(l1, l2);
	};
	const updateActiveLinePos = function () {
		const [l1, l2] = [
			parseInt(markDom1.style.left),
			parseInt(markDom2.style.left)
		].sort((a, b) => a - b);
		activeLineDom.style.left = l1 + "%";
		activeLineDom.style.width = l2 - l1 + "%";
		debounceChange(l1, l2);
	};

	let movingDom = null;
	let baseLeft = 0;
	let baseX = 0;
	const handleMouseMove = function (e) {
		const diff = Math.floor(
			((e.clientX - baseX) * 100) / container.clientWidth + 0.5
		);
		const nextLeft = Math.min(Math.max(0, diff + baseLeft), 100);
		const currentLeft = parseInt(movingDom.style.left);
		if (currentLeft === nextLeft) {
			return;
		}

		movingDom.style.left = nextLeft + "%";
		if (movingDom === activeLineDom) {
			updateMarkPos();
		} else {
			updateActiveLinePos();
		}
	};
	const handleMouseDown = function (e) {
		movingDom = this;
		baseX = e.clientX;
		baseLeft = parseInt(this.style.left);
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};
	const handleMouseUp = function () {
		document.removeEventListener("mousemove", handleMouseMove);
		document.removeEventListener("mouseup", handleMouseUp);
	};
	markDom1.addEventListener("mousedown", handleMouseDown);
	markDom2.addEventListener("mousedown", handleMouseDown);
	activeLineDom.addEventListener("mousedown", handleMouseDown);
}

(async function () {
	const dataCenter = new DataCenter();
	await dataCenter.initialize();

	const chart = new BenchmarkChart();

	const tagCtrl = new TagCtrl();
	tagCtrl.addChangeListener(async function (tags) {
		const data = await dataCenter.fetchChartData(tags);
		chart.updateChartData(data);
	});

	initializeAddAction(
		Object.keys(dataCenter.index),
		dataCenter.metrics,
		tagCtrl.has.bind(tagCtrl),
		tagCtrl.add.bind(tagCtrl)
	);
	initializeSlider((min, max) => {
		const [begin, end] = dataCenter.dateRange;
		const pc = (end - begin) / 100;
		chart.updateChartAxis(begin + pc * min, begin + pc * max);
	});
})();
