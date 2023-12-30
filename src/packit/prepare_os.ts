import { env } from "node:process"
import assert from "node:assert"
import { info } from "@actions/core"
import { exec } from "@actions/exec"

const nexssOS = require("@nexssp/os")

class Prepare_os {
	os: any
	_clean_env?: { [key: string]: string }

	constructor() {
		this.os = nexssOS()
	}

	public get dependencies(): string[] {
		// Check OS
		const with_python_action = "pythonLocation" in env
		let dependencies = ["git", "rpm", "rsync"]
		// When not using setup-python, installing python packages is much faster
		if (!with_python_action)
			dependencies.push(
				"python3-pycurl",
				"python3-gssapi",
				"python3-requests-kerberos",
				"python3-cccolutils",
				"python3-rpm",
				"python3-pip",
			)
		switch (this.os.name()) {
			case this.os.distros.FEDORA:
			case this.os.distros.CENTOS:
			case this.os.distros.RHEL:
				// Install python packages build requirements
				if (with_python_action)
					dependencies.push(
						"gcc",
						"libcurl-devel",
						"openssl-devel",
						"krb5-devel",
					)
				dependencies.push("rpm-build", "krb5-workstation")
				break
			case this.os.distros.UBUNTU:
			case this.os.distros.DEBIAN:
				// Install python packages build requirements
				if (with_python_action)
					dependencies.push(
						"gcc",
						"python3-rpm",
						"libcurl4-gnutls-dev",
						"libgnutls28-dev",
						"libkrb5-dev",
					)
				dependencies.push("krb5-user", "krb5-k5tls", "ca-certificates")
				break
			default:
				info(
					`Unsupported platform "${this.os.name()}". Dependency installation may fail`,
				)
				break
		}
		return dependencies
	}

	get clean_env(): { [key: string]: string } {
		// Running `dnf` with setup-python can clash. During these steps, we are
		// sanitizing the environment variables
		if (this._clean_env === undefined) {
			let clean_env: { [key: string]: string } = {}
			for (const [key, value] of Object.entries(env)) {
				if (/(LD_LIBRARY_PATH|Python\d?_ROOT_DIR)/.test(key)) continue
				assert(value != undefined)
				clean_env[key] = value
			}
			this._clean_env = clean_env
		}
		return this._clean_env
	}

	public async install(dependencies?: string[]): Promise<number> {
		if (dependencies == undefined) dependencies = this.dependencies
		if (/apt/.test(this.os.getPM("update")))
			await exec(`${this.os.sudo()}${this.os.getPM("update")}`, undefined, {
				env: this.clean_env,
			})
		return exec(
			`${this.os.sudo()}${this.os.getPM("install")} ${dependencies.join(" ")}`,
			undefined,
			{ env: this.clean_env },
		)
	}
}

export { Prepare_os }
