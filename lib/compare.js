export function compare(base, current) {
	const diff = {};
	for (const key of new Set([...Object.keys(base), ...Object.keys(current)])) {
		const baseValue = base[key];
		const currentValue = current[key];
		if (baseValue === undefined || currentValue === undefined) {
			continue;
		}

		diff[key] = {
			baseMean: baseValue.mean,
			baseConfidence: baseValue.confidence,
			currentMean: currentValue.mean,
			currentConfidence: currentValue.confidence
		};
	}
	return diff;
}
