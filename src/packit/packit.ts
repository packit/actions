import { exec, getExecOutput } from "@actions/exec"
import { join, resolve } from "node:path"
import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { homedir, tmpdir } from "node:os"
import assert from "node:assert"
import { env } from "node:process"
import { exportVariable } from "@actions/core"
import dedent from "dedent"

class Packit {
	_version?: string

	public async install(version?: string) {
		// Do actual packit install
		await exec(`python3 -m pip install packitos${version}`)
	}

	public async authenticate(fas_user: string, keytab: string) {
		// Write basic authentication files for packit
		const config_dir = join(homedir(), ".config")
		access(config_dir)
			.catch(() => {
				mkdir(config_dir, { recursive: true })
			})
			.then(() => {
				writeFile(
					join(homedir(), ".config", "packit.yaml"),
					dedent`
                    fas_user: ${fas_user}
                    `,
				)
				writeFile(
					join(homedir(), ".config", "copr"),
					dedent`
                    [copr-cli]
                    copr_url = https://copr.fedorainfracloud.org
                    gssapi = true
                    `,
				)
			})

		// Create the temporary folder containing kerberos credentials and run kinit
		mkdtemp(join(tmpdir(), "packit-"))
			.then((res) => {
				const tmp_dir = resolve(res)
				const kt_file = join(tmp_dir, "user.keytab")
				const ccache_file = `FILE:${join(tmp_dir, `krb5cc_${fas_user}`)}`
				env["KRB5CCNAME"] = ccache_file
				exportVariable("KRB5CCNAME", ccache_file)
				writeFile(kt_file, keytab, { encoding: "base64" })
				return kt_file
			})
			.then((kt_file) => {
				// Run `kinit` to authenticate and verify credentials
				exec("kinit", ["-kt", kt_file, `${fas_user}@FEDORAPROJECT.ORG`])
			})
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
