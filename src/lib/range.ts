type Params = {
	end: number;
	start?: number;
	step?: number;
};

export function range({ end, start = 0, step = 1 }: Params) {
	const numbers = [];
	for (let i = start; i < end; i += step) {
		numbers.push(i);
	}

	return numbers;
}
