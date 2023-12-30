import ncc from "@vercel/ncc"
import fs from "fs"
import path from "path"

build()

const enum ScriptType {
	Pre,
	Main,
	Post,
}
function get_scriptType(name: string): ScriptType {
	if (name.startsWith("pre_")) return ScriptType.Pre
	if (name.startsWith("post_")) return ScriptType.Post
	return ScriptType.Main
}
function get_outputFile(type: ScriptType): string {
	switch (type) {
		case ScriptType.Main:
			return "index.js"
		case ScriptType.Pre:
			return "pre.js"
		case ScriptType.Post:
			return "post.js"
	}
}

async function build() {
	const actionsDir = path.resolve(__dirname, "../actions")
	const buildDir = path.resolve(__dirname, "../../dist")

	const actions = fs
		.readdirSync(actionsDir, { withFileTypes: true })
		.filter((entity) => entity.isFile())
		.map((entity) => ({
			name: path
				.basename(entity.name, path.extname(entity.name))
				.replace(/^(pre|post)_/, ""),
			file: path.resolve(actionsDir, entity.name),
			type: get_scriptType(entity.name),
		}))

	for (const action of actions) {
		const files = await compile(action.file, action.type)
		write(files, path.resolve(buildDir, action.name))

		console.log(`✓ ${path.relative(__dirname, action.file)}`)
	}
}

async function compile(entry: string, type: ScriptType) {
	const output_file = get_outputFile(type)
	const { code, assets } = await ncc(entry, {
		cache: false,
		sourceMap: false,
		filename: output_file,
	})
	let files = assets
	files[output_file] = { source: code }

	return files
}

function write(files: any[], dir: string) {
	for (const fileName in files) {
		if (!files[fileName].source) {
			continue
		}

		const filePath = path.resolve(dir, fileName)

		fs.mkdirSync(path.dirname(filePath), { recursive: true })
		fs.writeFileSync(filePath, files[fileName].source, { encoding: "utf-8" })
	}
}
