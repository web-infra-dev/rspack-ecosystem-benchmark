module.exports = [
	{
		rebuildChangeFile: "./src/f0.jsx",
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
