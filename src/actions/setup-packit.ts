import { getInput, startGroup, endGroup, info, setFailed } from "@actions/core"
import dedent from "dedent"

import { Prepare_os } from "../packit/prepare_os"
import { Packit } from "../packit/packit"

async function run(): Promise<void> {
	const prepare_os = new Prepare_os()
	const packit = new Packit()

	startGroup("Install system dependencies")
	await prepare_os.install()
	endGroup()

	startGroup("Setup packit")
	const packit_version = getInput("packit-version")
	await packit.install(packit_version)
	endGroup()

	// Display information
	startGroup("packit info")
	info(
		dedent`
		packit-version: ${await packit.version}
		`,
	)
	endGroup()
}

run().catch((err) => setFailed(`Action failed:\n${err}`))
