module.exports = [
	{
		rebuildChangeFile: "./src/index.tsx",
		generateContent: function (originalContent, runTimes) {
			return (
				`import "data:text/javascript,export default ${runTimes}";
` + originalContent
			);
		}
	}
];
