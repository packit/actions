import { exec, getExecOutput } from "@actions/exec"
import assert from "node:assert"

class Packit {
	_version?: string
	public async install(version?: string) {
		// Do actual packit install
		await exec(`python3 -m pip install packitos${version}`)
	}

	public get version(): Promise<string> {
		return (async () => {
			if (this._version === undefined) {
				const out = await getExecOutput("packit --version")
				this._version = out.stdout
			}
			assert(this._version !== undefined)
			return this._version
		})()
	}
}

export { Packit }
