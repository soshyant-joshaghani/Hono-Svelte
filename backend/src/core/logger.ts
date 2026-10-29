type Fields = Record<string, unknown>;

function write(level: 'info' | 'error', message: string, fields?: Fields) {
	const line = JSON.stringify({
		level,
		message,
		time: new Date().toISOString(),
		...fields
	});
	if (level === 'error') console.error(line);
	else console.log(line);
}

export const log = {
	info(message: string, fields?: Fields) {
		write('info', message, fields);
	},
	error(message: string, fields?: Fields) {
		write('error', message, fields);
	}
};
