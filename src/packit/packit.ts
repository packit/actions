import { exec, ExecOptions, getExecOutput } from "@actions/exec"
import { join, resolve } from "node:path"
import { access, mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { homedir, tmpdir } from "node:os"
import assert from "node:assert"
import { env } from "node:process"
import { exportVariable } from "@actions/core"
import dedent from "dedent"

interface BuildCoprInterface {
	owner?: string
	project?: string
	pkg?: string
	path?: string
	debug?: boolean
}

class Packit {
	_version?: string

	public async install(version?: string) {
		// Do actual packit install
		return exec(`python3 -m pip install packitos${version}`)
	}

	public async authenticate(
		fas_user: string,
		keytab: string,
	): Promise<[[void, void], number]> {
		// Write basic authentication files for packit
		const config_dir = join(homedir(), ".config")
		const write_configs = access(config_dir)
			.catch(async () => {
				return mkdir(config_dir, { recursive: true })
			})
			.then(async () => {
				const packit_content = dedent`
                    fas_user: ${fas_user}
                    `
				const copr_content = dedent`
                    [copr-cli]
                    copr_url = https://copr.fedorainfracloud.org
                    gssapi = true
                    `
				return Promise.all([
					writeFile(join(homedir(), ".config", "packit.yaml"), packit_content),
					writeFile(join(homedir(), ".config", "copr"), copr_content),
				])
			})

		// Create the temporary folder containing kerberos credentials and run kinit
		const run_kinit = mkdtemp(join(tmpdir(), "packit-"))
			.then(async (res) => {
				const tmp_dir = resolve(res)
				const kt_file = join(tmp_dir, "user.keytab")
				const ccache_file = `FILE:${join(tmp_dir, `krb5cc_${fas_user}`)}`
				env["KRB5CCNAME"] = ccache_file
				exportVariable("KRB5CCNAME", ccache_file)
				await writeFile(kt_file, keytab, { encoding: "base64" })
				return kt_file
			})
			.then(async (kt_file) => {
				// Run `kinit` to authenticate and verify credentials
				return exec("kinit", ["-kt", kt_file, `${fas_user}@FEDORAPROJECT.ORG`])
			})
		return Promise.all([write_configs, run_kinit])
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

	public async build_copr(opts: BuildCoprInterface) {
		let args = ["--wait"]
		let base_args = []
		let options: ExecOptions = {}
		if (opts.owner) args.push("--owner", opts.owner)
		if (opts.project) args.push("--project", opts.project)
		if (opts.pkg) args.push("--package", opts.pkg)
		if (opts.path) options.cwd = opts.path
		if (opts.debug) base_args.push("-dd")

		return exec("packit", [...base_args, "build", "in-copr", ...args], options)
	}
}

export { Packit }
