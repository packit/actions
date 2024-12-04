import {
	getInput,
	startGroup,
	endGroup,
	info,
	isDebug,
	setFailed,
} from "@actions/core"
import { Packit } from "../packit/packit"
import dedent from "dedent"

async function run(): Promise<void> {
	const packit = new Packit()

	// Check that packit is executable
	startGroup("packit version")
	info(
		dedent`
		packit-version: ${await packit.version}
		`,
	)
	endGroup()

	// Sanitize input
	const owner = getInput("owner")
	const project = getInput("project")
	const pkg = getInput("package")
	const path = getInput("path")

	// Actual packit execution
	startGroup("packit run")
	await packit.build_copr({
		owner: owner,
		project: project,
		pkg: pkg,
		path: path,
		debug: isDebug(),
	})
	endGroup()
}

run().catch((err) => setFailed(`Action failed:\n${err}`))
