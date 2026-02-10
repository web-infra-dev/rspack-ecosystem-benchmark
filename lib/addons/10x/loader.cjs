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

	const appendQuery = (specifier, query) => {
		if (!specifier.startsWith(".")) return specifier;
		if (specifier.includes(query)) return specifier;
		return specifier.includes("?") ? `${specifier}&${query.slice(1)}` : `${specifier}${query}`;
	};

	// Add resource query to relative import/export specifiers, including multiline imports and side-effect imports.
	const withFrom = source.replace(
		/(from\s*['"`])([^'"`]+)(['"`])/g,
		(_, prefix, specifier, suffix) => `${prefix}${appendQuery(specifier, this.resourceQuery)}${suffix}`
	);

	return withFrom.replace(
		/(import\s*['"`])([^'"`]+)(['"`])/g,
		(_, prefix, specifier, suffix) => `${prefix}${appendQuery(specifier, this.resourceQuery)}${suffix}`
	);
};
