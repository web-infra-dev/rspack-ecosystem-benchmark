module.exports = [
	{
		rebuildChangeFile: "./src/index.js",
		generateContent: function (originalContent, runTimes) {
			return (
				originalContent +
				`
console.log(${runTimes});
`
			);
		}
	}
];
