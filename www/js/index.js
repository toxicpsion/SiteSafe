/* global 
cordova, ons, 
StackTrace, Connection
CordovaPromiseFS, hex_sha1

modal
*/

//Included Modules I Use:

//CordovaPromiseFS: MIT Licence - https://github.com/markmarijnissen/cordova-promise-fs
//Sha1: BSD Licence - http://pajhome.org.uk/crypt/md5/
//signature_pad: MIT Licence - https://github.com/szimek/signature_pad

// eslint-disable-next-line no-unused-vars
let sixWestPromiseAPI = {
	APIServerDefault: "http://artisan.6west.ca:16022",
	sendLog: function sendLog(
		message,
		logmodule = "MAIN",
		host = sixWestPromiseAPI.APIServerDefault
	) {
		if (!sixWestPromiseAPI.isConnected) return;

		fetch(host + "/log", {
			method: "post",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client: app.thisStartUUID,
				module: logmodule,
				message: message,
			}),
		})
			.then((r) => r.text())
			.then((data) => {
				console.debug("logserver returned: ", data);
			});
	},
	isConnected: async function isConnected() {
		return await new Promise((resolve, reject) => {
			if (navigator.connection.type == Connection.UNKNOWN) reject();

			if (navigator.connection.type == Connection.NONE) {
				resolve(false);
			} else if (
				navigator.connection.type == Connection.WIFI ||
				navigator.connection.type == Connection.ETHERNET
			) {
				sixWestPromiseAPI
					.pingServer()
					.then((pingResponse) => {
						console.debug(pingResponse);
						resolve(pingResponse);
					})
					.catch(() => resolve(false));
			} else if (
				navigator.connection.type != Connection.NONE &&
				navigator.connection.type != Connection.UNKNOWN
			) {
				if (app.preferences.minimizeDataUse) {
					resolve(false);
				} else {
					sixWestPromiseAPI
						.pingServer()
						.then((pingResult) => {
							resolve(pingResult);
						})
						.catch(() => resolve(false));
				}
				//
			} else {
				resolve(false);
			}
		});
	},
	pingServer: function pingServer(host = sixWestPromiseAPI.APIServerDefault) {
		// eslint-disable-next-line no-unused-vars
		return new Promise((resolve, reject) => {
			
			let thisRequestTime = parseInt(Date.now() / 1000);
			let pingTargetTime =
				(sixWestPromiseAPI.lastPingTime || 0) + app.preferences.pingTimeout;

			if (pingTargetTime - thisRequestTime < 0) {
				console.debug("Ping APIServer");

				clearTimeout(sixWestPromiseAPI.pinger);

				sixWestPromiseAPI.pinger = setTimeout(
					sixWestPromiseAPI.pingServer.bind(),
					(app.preferences.pingTimeout + 5) * 1000
				); //timeout + 5sec to allow expire

				fetch(host + "/ping", {
					method: "post",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						u:
							typeof app.currentUser != typeof undefined
								? app.currentUser.username
								: "",
						p:
							typeof app.currentUser != typeof undefined
								? app.currentUser.passhash
								: "",
						s: app.thisStartUUID,
					}),
				})
					.then((r) => r.text())
					.then((data) => {
						if (data) {
							sixWestPromiseAPI.lastPingTime = thisRequestTime;

							resolve(true);
						}
						resolve(false);
					})
					.catch(() => {
						resolve(false);
					});
			} else {
				console.debug("Ping Still Valid");
				resolve(true);
			}
		});
	},
	loadProvisioning: async function (user = false) {
		if (!user) {
			if (await app.fs.exists("sixwest_provisioning")) {
				console.debug("Provisioning data.");

				app.fs.remove("sixwest_provisioning");
				console.debug("removed");
				//REMOVEME
			} else {
				console.debug("Not Provisioned");
			}
		} else {
			//fetch
			return false;
		}
	},
	doLogin: function (username, password) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);

			fetch(`${this.APIServerDefault}/user/login`, {
				method: "post",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username: username,
					passhash: hex_sha1(password),
				}),
			})
				.then((r) => r.json())
				.then((data) => {
					if (data.res == 200) {
						console.warn(data.user);
						data.user.passhash = hex_sha1(password);

						//Check Connected
						app.log(data.user.name, "LOGIN");
						sixWestPromiseAPI.lastPingTime = Date.now() / 1000;

						resolve(data.user);
					} else {
						reject({ code: data.res });
					}
				});
		});
	},
	doLogout: function () {
		app.fs.remove("cache/userProfile").then((e) => {
			console.debug(e);
			app.currentUser = undefined;
			delete app.currentUser;

			location.reload();
		});
	},
	queryResource: function (resource, params = {}) {
		return new Promise(function (resolve, reject) {
			console.debug("queryResource");
			console.debug(resource, params);

			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);
		});
	},
	fetchResource: function (resource, params = {}) {
		return new Promise(function (resolve, reject) {

			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);

			sixWestPromiseAPI.isConnected().then((connected) => {
				if (connected) {
					fetch(`${sixWestPromiseAPI.APIServerDefault}/fetch/${resource}`, {
						method: "post",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							u: app.currentUser.username,
							p: app.currentUser.passhash,
							params: params,
						}),
					})
						.then((r) => r.json())
						.then((data) => {
							console.log(data[0])
							app.fs.write(`${resource}`, JSON.stringify(data[0])).then((e) => {
								resolve(data[0]);
							});
						});
				} else {
					app.fs.exists(`${resource}`).then((f) => {
						if (f.isFile) {
							//exists
							app.fs.read(f).then((data) => {
								console.debug(`cache hit. ${resource}`);
								resolve(JSON.parse(data));
							});
						} else {
							reject();
						}
					});
				}
			});
		});
	},
	putResource: function (resource, params = {}) {
		return new Promise(function (resolve, reject) {
			console.debug("putResource");
			console.debug(resource, params);
			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);
		});
	},
	listResource: function (resource, options = {}) {
		return new Promise(function (resolve, reject) {
			console.debug("listResource");
			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);

			sixWestPromiseAPI.isConnected().then((connected) => {
				if (connected) {
					fetch(`${sixWestPromiseAPI.APIServerDefault}/list/${resource}`, {
						method: "post",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							u: app.currentUser.username,
							p: app.currentUser.passhash,
							options: options,
						}),
					})
						.then((r) => r.json())
						.then((data) => {
							app.fs
								.write(`${resource}_list`, JSON.stringify(data))
								.then((e) => {
									resolve(data);
								});
						});
				} else {
					app.fs.exists(`${resource}_list`).then((f) => {
						if (f.isFile) {
							//exists
							app.fs.read(f).then((data) => {
								console.debug(`cache hit. ${resource}_list`);
								resolve(JSON.parse(data));
							});
						} else {
							reject();
						}
					});
				}
			});
		});
	},
};

let app = {
	state: {
		documentList: {},
		templateList: {},
		template:[],
	},
	preferences: {
		//DEFAULTS
		//reset: delete saved prefs on startup
		debug: false,
		reset: false,
		minimizeDataUse: true,
		pingTimeout: 5,
		_description: {
			debug: "Enable Network debugging",
			reset: "Clear Saved Settings on next start",
			minimizeDataUse: "Minimize data use.",
			pingTimeout: "API Check Interval",
		},
	},
	log: function (message, logmodule = "MAIN") {
		if (app.preferences.debug) {
			sixWestPromiseAPI.sendLog(message, logmodule);
		}

		console.log(
			JSON.stringify({
				client: app.thisStartUUID,
				module: logmodule,
				message: message,
			})
		);
	},
	loadPreferences: function () {
		return new Promise((resolve, reject) => {
			app.fs
				.exists("preferences")
				.then((exists) => {
					if (exists) {
						console.debug("prefs.exist");
						app.fs
							.readJSON("preferences")
							.then((storedPrefs) => {
								if (storedPrefs.reset) {
									app
										.savePreferences()
										.then(() => {
											console.debug("prefs.reset: OK");
											resolve(true);
										})
										.catch(() => {
											console.debug("prefs.reset: FAILED");
											reject({
												msg: "Failed to reset preferences.",
											});
										});
								} else {
									app.preferences = storedPrefs;
									resolve(true);
								}
							})
							.catch(() => {
								console.warn("Failed to parse preferences.\nStoring Defaults.");
								app
									.savePreferences()
									.then(() => {
										app.loadPreferences().then((e) => {
											if (e) {
												console.debug("Reinitialized Preferences");
												resolve(true);
											} else {
												console.debug("Failed to reset malformed preferences");
												app.fatalError("File Error", "malformed prefs.");
												reject("Failed to reset malformed preferences");
											}
										});
									})
									.catch(() => {
										app.fatalError(
											"File Error",
											"Failed to replace malformed preferences"
										);
										//location.reload();
									});
							});
					} else {
						app
							.savePreferences()
							.then(() => {
								console.debug("Preferences Not Found. Wrote Defaults");
								resolve(true);
							})
							.catch((e) => {
								console.debug(
									"Preferences Not Found.  Failed To write Defaults"
								);
								reject(e);
							});
					}
				})
				.catch(() => {
					app.log("FS Error", "loadPreferences");
				});
		});
	},
	savePreferences: async function () {
		return app.fs.write("preferences", app.preferences);
	},
	fs: CordovaPromiseFS({
		persistent: true, // or false
		storageSize: 100 * 1024 * 1024, // storage size in bytes, default 20MB // 0: unlimited?
		concurrency: 3, // how many concurrent uploads/downloads?
	}),
	initialize: () => {
		if (typeof cordova == typeof undefined) {
			app.fatalError(`App Startup Failed`, `Cordova seems to be missing.`);
			sixWestPromiseAPI.sendLog("missing cordova");
		} else {
			var appRootURL = window.location.href.replace("index.html", "");

			window.onerror = function (errorMsg, url, line, col, error) {
				var logMessage = errorMsg;
				var stackTrace = null;

				var sendError = function () {
					sixWestPromiseAPI.sendLog(logMessage);
					ons.notification.alert(logMessage);

					return;
				};

				logMessage += `<hr> ${url.replace(appRootURL, "")}:${line}:${col} `;

				if (error && typeof error === "object") {
					StackTrace.fromError(error).then(function (trace) {
						// eslint-disable-next-line no-unused-vars
						stackTrace = trace;
						sendError();
					});
				} else {
					sendError();
				}
			};

			document.addEventListener("deviceready", app.deviceReady.bind());
		}
	},
	fatalError: function fatalError(title, message) {
		console.error(`Fatal error:\n${title}`, message);

		let m = document.querySelector(".lModalMessage");

		m.innerHTML = `<ons-icon icon="exclamation" size="10vh"></ons-icon>
			<p>${title}
			<hr width="60%"><br>
			${message}
			<br><br><ons-button onClick="throw new RuntimeException("${message}"); navigator.app.exitApp();">EXIT</ons-button></p>`;

		document.querySelector("ons-modal").show();
	},
	deviceReady: function deviceReady() {
		cordova.getAppVersion.getVersionNumber().then((version) => {
			app.version = version;
			app.log(`deviceReady (${app.version})`);
		});

		app.thisStartUUID = hex_sha1(String(Date.now()));

		if (ons.platform.isIPhoneX()) {
			console.debug("Applying IphoneX css fixes.");
			document.documentElement.setAttribute("onsflag-iphonex-portrait", "");
			document.documentElement.setAttribute("onsflag-iphonex-landscape", "");
		}

		document.addEventListener("init", app.pageInitHandler, false);
		document.addEventListener("show", app.pageShowHandler, false);

		app
			.loadPreferences()
			.then((e) => {
				if (e) {
					console.debug("Loaded Preferences");
				} else {
					console.debug("Failed to load Preferences");
				}

				//Ping Once At start
				sixWestPromiseAPI
					.isConnected()
					.then(() => {})
					.catch((e) => console.debug(e));
			})
			.catch((e) => {
				app.log("LOADFAIL" + JSON.stringify(e));
				//debugger;
			});

		sixWestPromiseAPI
			.loadProvisioning()

			.then(() => {
				app.fs.exists("cache/userProfile").then((e) => {
					if (e) {
						console.debug("Stored User Profile");
						app.fs.readJSON("cache/userProfile").then((storedUser) => {
							app.currentUser = storedUser;

							document
								.getElementById("rootNavigator")
								.resetToPage("tpl_tabNavigator");
						});
					} else {
						console.debug("No Stored User Profile");
						document
							.getElementById("rootNavigator")
							.resetToPage("tpl_loginPage");
					}
				});
			});
	},
	pageInitHandler: function (event) {
		console.debug("pageInitHandler stub: " + event.target.id);
		switch (event.target.id) {
			case "p_settings": {
				let list = document.getElementById("l_preferences");
				list.innerHTML = "";

				for (let [key, value] of Object.entries(app.preferences)) {
					if (key.charAt(0) == "_") break;

					switch (typeof app.preferences[key]) {
						case "boolean": {
							let i = ons.createElement(`
							<ons-list-item>
								<div class="left">
								${app.preferences._description[key]}
								</div>
								<div class="right">
								<ons-switch ${value == true ? "checked" : ""}></ons-switch>
								</div>
							   </ons-list-item>`);

							list.appendChild(i);

							i.addEventListener("change", function () {
								app.preferences[key] = this.querySelector("ons-switch").checked;
							});

							break;
						}
						case "number": {
							let i = ons.createElement(`
							<ons-list-item tappable>
								<ons-row><ons-col>${app.preferences._description[key]}</ons-col><ons-col>
								<ons-range type="number" min="15" max="3600" step="15" value="${value}"></ons-range>
								</ons-col>
								<ons-col class="value">
									${value}
								</ons-col>
								</ons-row>
							   </ons-list-item>`);

							list.appendChild(i);

							i.addEventListener("input", function () {
								app.preferences[key] = parseInt(
									this.querySelector("ons-range").value
								);
								this.querySelector(".value").innerHTML = app.preferences[key];
							});
							i.addEventListener("change", function () {
								localStorage.setItem("prefs", JSON.stringify(app.preferences));
							});
							break;
						}
						default: {
							console.warn(`Unknown Datatype: ${typeof app.preferences[key]}	`);
						}
					}
				}

				let i = ons.createElement("<ons-row></ons-row>");
				i.appendChild(
					ons.createElement(
						`<ons-col style="width: 80%" class="center">
					<ons-button icon="save" id="btn_SaveSettings">
					&nbsp;&nbsp;Save Settings
					</ons-button>
		  		</ons-col>`
					)
				);

				list.appendChild(i);

				document
					.getElementById("btn_SaveSettings")
					.addEventListener("click", function () {
						app.savePreferences();
					});
				break;
			}
			case "p_login": {
				document
					.getElementById("btnLogin")
					.addEventListener("click", function () {
						modal.show("Validating Credentials");

						sixWestPromiseAPI
							.doLogin(
								document.getElementById("username").value,
								document.getElementById("password").value
							)
							.then((e) => {
								if (e.isFirstRun) {
									document
										.getElementById("rootNavigator")
										.pushPage("tpl_accountPage", { data: { mode: "verify" } });
									return;
								} else {
									history.pushState({}, "Login Success.");

									app.currentUser = e;
									if (document.getElementById("remember").checked) {
										app.fs
											.write("cache/userProfile", app.currentUser)
											.then(console.debug("Saved User"));
									}
									document
										.getElementById("rootNavigator")
										.resetToPage("tpl_tabNavigator");

									modal.hide();
								}
							})
							.catch(() => {
								ons.notification.alert(
									"Check your credentials and try again.",
									{
										title: "Login Failed",
									}
								);
								modal.hide(); //or hangs @ validating credentials
							});
					});
				break;
			}
			case "navigationTabPage": {
				//

				break;
			}
			case "p_documents": {
				let tb = document.querySelector(".topToolbar");
				tb.innerHTML = "";

				let logo = ons.createElement(`<img class="toolbarIcon">`);
				logo.addEventListener("click", () => location.reload());
				tb.appendChild(logo);

				let user = ons.createElement(
					`<div class="toolbarUserName right" id="l_userID">${app.currentUser.name}</div>`
				);
				let userIcon = ons.createElement(`<img class="toolbarUserIcon">`);
				user.appendChild(userIcon);
				tb.appendChild(user);

				user.onclick = function () {
					document
						.getElementById("rootNavigator")
						.pushPage("tpl_accountPage", { data: { mode: "modify" } });
				};

				app.updateDocumentList();

				break;
			}
			default: {
				//
			}
		}
	},
	pageShowHandler: function (event) {
		console.debug("pageShowHandler stub: " + event.target.id);
		switch (event.target.id) {
			case "p_accountPage": {
				document.querySelector(".topToolbar").style.visibility = "hidden";

				let cBar = document.querySelector(".commandBar");
				cBar.innerHTML = "";

				cBar.appendChild(
					ons.createElement(
						`<ons-button class="cancelButton" icon="back">&nbsp;Close</ons-button>`
					)
				);
				cBar.appendChild(
					ons.createElement(
						`<ons-button class="saveButton disabled" icon="save">&nbsp;Save</ons-button>`
					)
				);
				cBar
					.querySelector(".cancelButton")
					.addEventListener("click", function () {
						cBar.style.visibility = "hidden";
						cBar.innerHTML = "";
						document.querySelector(".topToolbar").style.visibility = "visible";
						document.getElementById("rootNavigator").popPage();
					});

				cBar.style.visibility = "visible";

				let page = document.getElementById("p_accountPage");
				let canvas = page.querySelector(".renderCanvas");

				canvas.innerHTML = `
			<img class="userImage"><br>
			<div>
				<div class="username">${app.currentUser.name}</div>
				<div class="email">${app.currentUser.email}</div>
			</div>
			<hr>
			<div>${app.currentUser.phone || ""}</div><hr>
			<div>Notes:<br>${app.currentUser.notes}</div>
			<div style="padding-top: 2em"> 
				<ons-button class="logoutButton" icon="times">&nbsp;Logout</ons-button>
			</div>
			`;
				canvas
					.querySelector(".logoutButton")
					.addEventListener("click", sixWestPromiseAPI.doLogout);

				break;
			}
			case "p_documents": {
				app.updateDocumentList();
				break;
			}
			default: {
				//
			}
		}
	},
	updateDocumentList: function () {
		let docList = document.getElementById("documentList");
		if (!document.getElementById("d_actionStrip")) {
			let d_actionStrip = ons.createElement(
				'<div id="d_actionStrip" style="position: relative; top: 1em; white-space: nowrap; margin: 0px auto; text-align: center;"></div>'
			);

			let b_CreateNew = ons.createElement(
				'<ons-button icon="plus">&nbsp;&nbsp;CREATE NEW</ons-button>'
			);
			b_CreateNew.addEventListener(
				"click",
				function () {
					ons.notification.alert("CreateDoc!");
					return;

					document.getElementById("rootNavigator").pushPage("t_docRender", {
						data: {
							templateID: 0,
							parentID: 0,
						},
					});
				},
				false
			);
			d_actionStrip.append(b_CreateNew);
			docList.parentNode.append(d_actionStrip);
		}
		sixWestPromiseAPI
			.listResource("templates", { test: "test" })
			.then((resourceList) => {
				// Get only toplevel templates
				//	resourceList = resourceList.filter((item) => item.id.length < 5);
				app.state.templateList = resourceList;

				resourceList.forEach((e) => {
					sixWestPromiseAPI
						.fetchResource("templates/" + e.id)
						.then(() => {});
				});
			});

		sixWestPromiseAPI
			.listResource("documents", { test: "test" })
			.then((resourceList) => {
				let newDocuments = UTIL.getNewObjectKeys(
					resourceList,
					app.state.documentList
				);

				let removedDocuments = UTIL.getNewObjectKeys(
					app.state.documentList,
					resourceList
				);

				app.state.documentList = resourceList;

				//newRootDocuments = newDocuments.filter((item) => item.root_node == "0");
				if (Object.keys(newDocuments).length) {
					for (const key in newDocuments) {
						sixWestPromiseAPI
							.fetchResource("documents/" + newDocuments[key].id)
							.then((d) => console.log(d[0]));
					}
				}
			});
	},
};

ons.ready(() => {
	console.debug("UI Ready");
});
