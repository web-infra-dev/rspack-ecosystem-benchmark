module.exports = [
	{
		rebuildChangeFile: "./src/Three.js",
		generateContent: function (originalContent, runTimes) {
			return (
				`import "data:text/javascript,export default ${runTimes}";
` + originalContent
			);
		}
	}
];
