import {
	getInput,
	startGroup,
	endGroup,
	info,
	error,
	setFailed,
} from "@actions/core"
import { env } from "node:process"
import assert from "node:assert"
import dedent from "dedent"

import { Prepare_os } from "../packit/prepare_os"
import { Packit } from "../packit/packit"

async function run(): Promise<void> {
	const prepare_os = new Prepare_os()
	const packit = new Packit()

	// Prepare OS dependencies
	startGroup("Install system dependencies")
	return prepare_os
		.install()
		.then(async () => {
			// install packit
			endGroup()
			startGroup("Setup packit")
			const packit_version = getInput("packit-version")
			return packit.install(packit_version)
		})
		.then(async () => {
			// Configure authentication
			endGroup()
			startGroup("Authenticating packit")
			const fas_user = getInput("fas-user")
			let keytab = getInput("keytab")
			if (!keytab) {
				if (!("PACKIT_KEYTAB" in env))
					error(
						dedent`
                        No keytab provided. Provide one either as an input or PAKIT_KEYTAB environment.
                        See this comment for creating the keytab: https://pagure.io/fedora-infrastructure/issue/9544#comment-706949
                        Use \`base64\` to encode the keytab and save it as a secret.
                        `,
					)
				assert(env.PACKIT_KEYTAB !== undefined)
				keytab = env.PACKIT_KEYTAB
			}
			await packit.authenticate(fas_user, keytab)
			return { fas_user: fas_user }
		})
		.then(async (res) => {
			// Display information
			endGroup()
			startGroup("packit info")
			info(
				dedent`
                fas-user: ${res.fas_user}
                packit-version: ${await packit.version}
                `,
			)
			endGroup()
		})
}

run().catch((err) => setFailed(`Action failed:\n${err}`))
