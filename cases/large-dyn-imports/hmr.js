module.exports = [
	{
		rebuildChangeFile: "./src/index.js",
		generateContent: function (originalContent, runTimes) {
			return (
				`import "data:text/javascript,export default ${runTimes}";
` + originalContent
			);
		}
	}
];
