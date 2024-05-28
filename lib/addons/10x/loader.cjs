module.exports = function (source) {
	const { times } = this.getOptions();
	if (!this.resourceQuery) {
		// entry
		const resourcePath = this.resourcePath;
		return new Array(times)
			.fill(1)
			.map((_, index) => {
				return `export * as t${index} from "${resourcePath}?time=${index}";`;
			})
			.join("\n");
	}

	// add resource query to all import and export
	return source.replace(/(import|export).+?from +['"`]\..+?['"`]/g, str => {
		return str.slice(0, -1) + this.resourceQuery + str.slice(-1);
	});
};
