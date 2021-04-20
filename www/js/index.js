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
				//console.debug("Ping APIServer");

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
	__queryResource: function (resource, params = {}) {
		return new Promise(function (resolve, reject) {
			console.debug("queryResource");
			console.debug(resource, params);

			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);
		});
	},
	fetchUser: function (user) {
		return new Promise(function (resolve, reject) {
			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);
			sixWestPromiseAPI.isConnected().then((connected) => {
				if (connected) {
					fetch(`${sixWestPromiseAPI.APIServerDefault}/user/fetch/${user}`, {
						method: "post",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							u: app.currentUser.username,
							p: app.currentUser.passhash,
							userID: user,
						}),
					})
						.then((r) => r.json())
						.then((data) => {
							console.log(data);
							resolve(data);
						});
				}
			});
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
							try {
								data.data = JSON.parse(data.data);
							} catch {}

							if (data.mapping) {
								try {
									data.mapping = JSON.parse(data.mapping);
								} catch {
									data.mapping = {};
								}
							}
							app.fs.write(`${resource}`, JSON.stringify(data)).then((e) => {
								resolve(data);
							});
						})
						.catch((c) => {
							debugger;
							reject({ status: false, message: "Error in JSON response." });
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
	putResource: function putResource(resource, params = {}) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);

			fetch(`${this.APIServerDefault}/push`, {
				method: "post",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					u: app.currentUser.username,
					p: app.currentUser.passhash,
					resource: resource,
				}),
			})
				.then((r) => r.json())
				.then((data) => {
					resolve(data);
				});
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

	//BEWARE!! getFillableControlFromJSON recurses.
	getFillableControlFromJSON: function getFillableControlFromJSON(obj_JSON) {
		addSubItems = () => {
			thisElement.classList.add("hasSubItems");

			let subControlElement = ons.createElement(`<div></div>`);
			subControlElement.classList.add("subGroupContainer");

			subControlElement.addEventListener("touchend", function () {
				console.warn(this);
				this.classList.add("hasInteracted");
			});

			obj_JSON.data.forEach((subelement) => {
				subControlElement.appendChild(
					sixWestPromiseAPI.getFillableControlFromJSON(subelement)
				);
			});

			thisElement.appendChild(subControlElement);
		};
		let thisElement = ons.createElement(`<div class="controlItem"></div>`);

		switch (obj_JSON.type) {
			// LABEL
			case 0: {
				thisElement.appendChild(
					ons.createElement(
						`<div class="itemHeader">
						<span class="itemTitle">${obj_JSON.text}</span>
						<span class="itemDesc">${obj_JSON.desc ? obj_JSON.desc : ""}</span>
						</div>`
					)
				);
				break;
			}
			//Range Slider
			case 1: {
				thisElement.appendChild(
					ons.createElement(
						`<div class="itemHeader">
						<span class="itemTitle">${obj_JSON.text}</span>
						<span class="itemDesc">${obj_JSON.desc ? obj_JSON.desc : ""}</span>
						</div>`
					)
				);

				let thisControl = ons.createElement(`
					<div style="text-align:right;">
					<div style="position: relative; bottom: 0px;" class="thisValue" id="fResp_${obj_JSON.id}">&nbsp;</div>						
					
					<ons-range  input-id="ibp_${obj_JSON.id}" value="0" max="5" min="1"></ons-range>	
						
					<div style="width: 100%; display: flex; justify-content: space-between; flex-grow: 1;font-size: xx-small;">
						<div>|</div><div>|</div><div>|</div><div>|</div><div>|</div>
					</div>
					<div style="width: 100%; display: flex; justify-content: space-between; flex-grow: 1; font-size: xx-small;">
					<div>Not Applicable</div><div></div><div></div><div></div><div>Immediate Danger</div>
				</div>
				</div>`);
				thisControl.querySelector("ons-range").addEventListener(
					"input",
					(e) => {
						console.log(e);
						vals = [
							"Not Applicable",
							"Acceptable",
							"Minor Risk",
							"Serious Risk",
							"Immediate Danger",
						];
						thisControl.querySelector(".thisValue").innerHTML =
							vals[e.target.value - 1];
					},
					{ passive: true }
				);
				thisElement.appendChild(thisControl);
				break;
			}
			//CheckBox
			case 2: {
				return ons.createElement(`
				<div class="formItem_checkbox">
				<ons-checkbox input-id="fResp_${obj_JSON.id}"></ons-checkbox> 
				<label for="fResp_${obj_JSON.id}">
					${obj_JSON.text}
				</label>
				</div>`);
			}
			//Text Input
			case 3: {
				return ons.createElement(
					`<div class="itemHeader">
						${obj_JSON.text}
						<ons-input 
							style="width: 100%;border: 1px dotted #CCCCCC; 
										border-radius: .2em; 
										background-color: #EEEEEE;" 
							id="o_${obj_JSON.id}" 
							input-id="fResp_${obj_JSON.id}" 
							float>
						</ons-input>
					</div>`
				);
			}
			//Multiline Text
			case 4: {
				return ons.createElement(`
				<div>
				<div class="itemHeader">${obj_JSON.text}</div>
				<textarea id="fResp_${obj_JSON.id}" 
				style="resize: none; 
						 height: ${obj_JSON.size ? obj_JSON.size : 70}vh;
						width: 90vw; 
				border-radius: .25em"></textarea>
				</div>`);
			}
			case 5: {
				return ons.createElement(`<img src="${obj_JSON.src}">`);
			}
			//Signature
			case 6: {
				let s = ons.createElement(`
				<canvas class="signatureBox"
				id="fResp_${obj_JSON.id}" 
				></canvas>`);
				let signaturePad = new SignaturePad(s);

				// setup pen inking
				signaturePad.minWidth = 0.1;
				signaturePad.maxWidth = 1.6;
				signaturePad.penColor = "blue";

				signaturePad.onEnd = function (e) {
					console.log(this);
					e.target.setAttribute("data", JSON.stringify(this.toData()));
				};

				return s;
			}
			default: {
				return ons.createElement(
					`<div style="background: #FFAAAA">${obj_JSON.text}</div>`
				);
			}
		}

		if (obj_JSON.data) {
			addSubItems();
		}

		return thisElement;
	},
};

let app = {
	state: {
		documentList: [],
		templateList: [],
		template: [],
	},
	preferences: {
		//DEFAULTS
		//reset: delete saved prefs on startup
		debug: false,
		reset: false,
		minimizeDataUse: false,
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
											let removeDir = (path) => {
												return new Promise((resolve, reject) => {
													app.fs
														.list(path, "d")
														.then((dirs) => {
															dirs.forEach((dir) => {
																removeDir(dir);
															});
														})
														.then(() => {
															app.fs.list(path, "f").then((files) => {
																files.forEach((file) => {
																	app.fs.remove(file);
																});
															});
														})
														.finally(() => resolve(true));
												});
											};
										
										removeDir("").then(() =>{
											console.log("removed cache");
										})
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

		app.rootNavigator = document.getElementById("rootNavigator");

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

		sixWestPromiseAPI.loadProvisioning().then(() => {
			app.fs.exists("cache/userProfile").then((e) => {
				if (e) {
					console.debug("Stored User Profile");
					app.fs.readJSON("cache/userProfile").then((storedUser) => {
						app.currentUser = storedUser;

						app.rootNavigator.resetToPage("tpl_tabNavigator");
					});
				} else {
					console.debug("No Stored User Profile");
					app.rootNavigator.resetToPage("tpl_loginPage");
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
									app.rootNavigator.pushPage("tpl_accountPage", {
										data: { mode: "verify" },
									});
									return;
								} else {
									history.pushState({}, "Login Success.");

									app.currentUser = e;
									if (document.getElementById("remember").checked) {
										app.fs
											.write("cache/userProfile", app.currentUser)
											.then(console.debug("Saved User"));
									}
									app.rootNavigator.resetToPage("tpl_tabNavigator");

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
					app.rootNavigator.pushPage("tpl_accountPage", {
						data: { mode: "modify" },
					});
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
						app.rootNavigator.popPage();
					});

				cBar.style.visibility = "visible";

				//let page = document.getElementById("p_accountPage");
				let canvas = document.querySelector("#p_accountPage .renderCanvas");

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
			case "p_docRender": {
				var template;
				console.debug("rendering: ", event.target.data.templateID);
				sixWestPromiseAPI
					.fetchResource("templates/" + event.target.data.templateID)
					.then((a) => {
						console.log(a);
						template = a;
						UTIL.waitForDOMSelector("#p_docRender .renderCanvas").then(
							(canvas) => {
								a.data.forEach((item) => {
									console.log(item);
									let thisItem = sixWestPromiseAPI.getFillableControlFromJSON(
										item
									);
									thisItem.addEventListener("touchend", function () {
										this.classList.add("hasInteracted");
										this.classList.remove("invalidated");

										this.querySelectorAll(".invalidated").forEach((e) => {
											console.log(e);
											e.classList.add("hasInteracted");
											e.classList.remove("invalidated");
										});
									});
									canvas.appendChild(thisItem);
								});
							}
						);
					});

				let cBar = document.querySelector(".topToolbar");
				document
					.querySelector(".saveButton")
					.addEventListener("click", function () {
						let pendingRequest = { data: {} };

						let failedValidation = false;
						let urgentAlert = false;
						let alertItems = [];

						let responses = document.querySelectorAll('[id^="fResp_"]');

						let t = document.querySelectorAll(".invalidated");

						t.forEach((i) => i.classList.remove("invalidated"));

						//Default Form Validator
						let thisValidator = function (response, templateItem) {
							switch (response.type) {
								case "text":
								case "textarea": {
									//console.warn(response.parentNode.classList.contains("hasInteracted"))
									response.value = response.value.trim();

									if (response.value == "" && templateItem.required) {
										return false;
									} else {
										return true;
									}
									break;
								}
								case "range": {
									console.log(
										//range element inside ons-range ui wrapper
										response.parentNode.parentNode.parentNode.classList
									);
									if (
										response.parentNode.parentNode.parentNode.classList.contains(
											"hasInteracted"
										)
									) {
										return true;
									} else {
										response.parentNode.parentNode.parentNode.classList.add(
											"invalidated"
										);
										return false;
									}
									break;
								}
								default: {
									if (response.className == "thisValue") {
										if (response.innerHTML.trim() == "&nbsp;") {
											return false;
										}
									}

									return true;
								}
							}
						};

						//load remote validator from template DBentry
						if (typeof template.validator == "string") {
							console.log("Loaded Validator from template.");
							thisValidator = new Function(
								"response",
								"templateItem",
								template.validator
							);
						}

						responses.forEach((response) => {
							//TODO: [SIT-2]
							let thisResp;
							let thisData = template.data.find(function (e) {
								return e.id == response.id.substr(6) ? true : false;
							});

							//debugger;
							try {
								if (!thisValidator(response, thisData)) {
									console.debug("Failed Validation", thisData);
									failedValidation = true;

									response.classList.add("invalidated");
								}
							} catch {
								console.log(
									"Validator exception.",
									JSON.stringify([response, thisData])
								);
							}

							switch (response.type) {
								case "range": {
									let vals = [
										"Not Applicable",
										"Acceptable",
										"Minor Risk",
										"Serious Risk",
										"Immediate Danger",
									];

									if (response.value > 3) {
										response.classList.add("invalidated");

										console.warn(thisData.text, vals[response.value - 1]);
										alertItems.push(
											JSON.parse(
												`{"${thisData.text}": "${vals[response.value - 1]}"}`
											)
										);

										urgentAlert = true;
									}
									thisResp = response.value;
									break;
								}

								case "text":
								case "textarea": {
									response.value = response.value.trim();
									thisResp = response.value;
									break;
								}
								case "checkbox": {
									thisResp = response.checked;
									break;
								}

								default: {
									if (response.classList.contains("signatureBox")) {
										thisResp = response.getAttribute("data");

										try {
											thisResp = JSON.parse(thisResp)[0];
										} catch { //Empty Signature?
											thisResp = [];
										}
										debugger;
										break;
									}

									if (response.classList.contains("thisValue")) {
										thisResp = response.innerHTML;
										break;
									}

									// Unhandled Control Type

									throw `${response.className}: ${response.id} = ${response.value}`;
								}
							}

							pendingRequest.data[response.id.substr(6)] = thisResp;
						});

						//subfield to root key mapping for title/subtitle etc.
						if (template.mapping) {
							for (const key in template.mapping) {
								pendingRequest.data[key] =
									pendingRequest.data[template.mapping[key]];
							}
						}
						//TODO: [SIT-5] Improve keymapper scope to .state.CurrentUser and .parentFBDoc
						pendingRequest.assigned = [app.currentUser.email];
						pendingRequest.author = app.currentUser.email;

						pendingRequest.authorName = app.currentUser.name;

						pendingRequest.template = event.target.data.templateID;

						pendingRequest.createdTimeUTC = Date.now();
						pendingRequest.parentDoc = event.target.data.parentID;
						pendingRequest.documentid = hex_sha1(
							Date.now() + app.currentUser.username
						);

						if (!failedValidation) {
							//TODO: [SIT-4] Add Multiple Root Template Support
							//if (event.target.data.templateID < 100) {
							if (true) {
								console.log("Creating in documents");
								console.log(pendingRequest);

								sixWestPromiseAPI.putResource(pendingRequest).then((e) => {
									console.log(e);
									if (e.status.success) {
										rootNavigator.popPage();
									}
								});
							} else {
								console.log(
									"creating Leaf Node for " + event.target.data.parentID
								);

								/* 					window.FirebasePlugin.addDocumentToFirestoreCollection(
									pendingRequest,
									`/documents/${event.target.data.parentID}/subdocuments`,
									(s) => {
										app.notify(
											`Saved As /documents/${event.target.data.parentID}/subdocuments/${s}`
										);

										if (urgentAlert) {
											let sMessage = `${
												app.state.currentUser.name
											} reported issues at ${
												app.state.documents[event.target.data.parentID].title
											} - ${
												app.state.documents[event.target.data.parentID].subtitle
											}.\n\n`;

											console.warn("Items to Alert:", alertItems);
											sMessage = sMessage + "";

											alertItems.forEach((AlertItem) => {
												for (const key in AlertItem) {
													if (
														Object.prototype.hasOwnProperty.call(AlertItem, key)
													) {
														const element = AlertItem[key];
														sMessage = sMessage + `${key}: ${element}\n`;
													}
												}
											});

											app.sendPushMessage({
												to: "/topics/urgent_notifications",
												user_originated: app.state.currentUser.email,
												notification: {
													body: sMessage,
													title:
														"Alert: " +
														app.state.documents[event.target.data.parentID]
															.title,
												},
												data: {
													items: alertItems,
													parent: event.target.data.parentID,
													target: `/documents/${event.target.data.parentID}/subdocuments/${s}`,
												},
											});
										}

										cBar.innerHTML = "";
										cBar.style.visibility = "hidden";
										document.getElementById("rootNavigator").popPage();
									},
									(e) => app.notify("Save Failed: " + e)
								); */
							}
						} else {
							ons.notification.alert("Requred Fields Missing.");
						}
						//alert(JSON.stringify(responses));
					});
				break;
			}
			case "p_docView": {
				let cBar = document.querySelector(".commandBar");
				cBar.innerHTML = "";

				cBar.appendChild(
					ons.createElement(
						`<ons-button class="cancelButton" icon="times">&nbsp;Close</ons-button>`
					)
				);
				let cButtonsR = ons.createElement("<div></div>");

				cButtonsR.appendChild(
					ons.createElement(
						`<ons-button class="printButton" icon="print"></ons-button>`
					)
				);
				if (app.currentUser.auth.rules.includes("delete")) {
					cButtonsR.appendChild(
						ons.createElement(
							`<ons-button class="deleteButton" icon="trash"></ons-button>`
						)
					);
				}
				cBar.appendChild(cButtonsR);

				cBar
					.querySelector(".cancelButton")
					.addEventListener("click", function () {
						cBar.style.visibility = "hidden";
						cBar.innerHTML = "";

						document.getElementById("rootNavigator").popPage();
					});

				cBar
					.querySelector(".printButton")
					.addEventListener("click", function () {
						let toPrint = document
							.getElementById("p_docView")
							.querySelector(".renderCanvas").content;

						cordova.plugins.printer.print(toPrint, { margin: false }, (res) => {
							console.log("Printing: " + event.target.data);

							cBar.innerHTML = "";
							cBar.style.visibility = "hidden";
							document.getElementById("rootNavigator").popPage();
						});
					});

				cBar.style.visibility = "visible";

				let canvas = document
					.getElementById("p_docView")
					.querySelector(".renderCanvas");

				debugger;

				canvas.appendChild(app.renderDocument(event.target.data));

				break;
			}
			default: {
				//
			}
		}
	},
	updateDocumentList: function () {
		console.log("Updating document List");
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
					let actionbuttons = [];

					debugger;
					app.state.templateList.forEach((t) => {
						if (t.id.length <= 4) {
							actionbuttons.push(
								JSON.parse(`{ "label": "${t.friendlyName}", "id": "${t.id}" }`)
							);
						}
					});

					actionbuttons.push(
						JSON.parse('{ "label": "Cancel", "id": "cancel"}')
					);

					ons
						.openActionSheet({
							id: "b_newdoc",
							title: `New...`,
							cancelable: true,
							buttons: actionbuttons,
						})

						.then(function (index) {
							if (index < 0) {
								// click outside menu (-1) cancels
								return;
							}
							switch (actionbuttons[index].id) {
								case "cancel":
									break;
								default:
									console.debug("New: ", actionbuttons[index].id);
									document
										.getElementById("rootNavigator")
										.pushPage("tpl_documentRenderer", {
											data: {
												templateID: actionbuttons[index].id,
												parentID: 0,
											},
										});
							}
						});
				},
				false
			);
			d_actionStrip.append(b_CreateNew);
			docList.parentNode.append(d_actionStrip);
		}

		sixWestPromiseAPI.listResource("templates").then((resourceList) => {
			// Get only toplevel templates
			//	resourceList = resourceList.filter((item) => item.id.length < 5);
			app.state.templateList = resourceList;

			resourceList.forEach((e) => {
				sixWestPromiseAPI
					.fetchResource("templates/" + e.id)
					.then(() => {
						//app.templates = ""
					})
					.catch((e) => {
						console.error(e);
					});
			});
		});

		sixWestPromiseAPI.listResource("documents").then((resourceList) => {
			let newDocuments = UTIL.getNewObjectKeys(
				resourceList,
				app.state.documentList
			);

			let removedDocuments = UTIL.getNewObjectKeys(
				app.state.documentList,
				resourceList
			);

			app.state.documentList = resourceList;

			if (Object.keys(removedDocuments).length) {
				for (const key in removedDocuments) {
					console.log("removing: ", removedDocuments[key]);
					document.getElementById(removedDocuments[key].id).remove();
					//delete app.state.documents[key]
				}
			} else {
				console.log("removing: none.");
			}

			if (Object.keys(newDocuments).length) {
				let d = {};
				d.toplevel = [];
				d.children = [];

				for (const key in newDocuments) {
					i = newDocuments[key];
					if (i.root_node == "0") {
						d.toplevel.push(i.id);
					} else {
						d.children.push(i.id);
					}
				}

				d.toplevel.forEach((a) => {
					sixWestPromiseAPI
						.fetchResource("documents/" + a)
						.then((thisDocument) => {
							thisDocument.createdTimeLocalString = new Date(
								parseInt(thisDocument.createdTimeUTC)
							).toDateString();

							let thisJob = document
								.getElementById("documentItem")
								.cloneNode(true);

							console.debug("adding Listitem >>", thisDocument);
							let thisItem = thisJob.content.querySelector("ons-list-item");
							thisItem.id = thisDocument.id;

							let itemControls = thisItem.querySelector(".controlArea");

							let btn = ons.createElement(
								`<ons-button class="addButton" icon="fa-plus"></ons-button>`
							);

							itemControls.appendChild(btn);

							var bClickHandler = function (event) {
								thisItem.toggleAttribute("expandable");
								console.log(thisItem);

								//thisItem.querySelector('.expandable-content').remove()

								console.log(event);
								event.stopPropagation();
								let cl = event.target.classList;

								if (event.target.classList.contains("ons-icon"))
									//got the icon, find parent
									cl = event.target.parentNode.classList;

								let cmd = "";
								if (cl.contains("addButton")) cmd = "add";
								if (cl.contains("printButton")) cmd = "print";
								if (cl.contains("assignButton")) cmd = "assign";
								if (cl.contains("deleteButton")) cmd = "delete";

								if (cl.contains("altState")) {
									cmd = "alt_" + cmd;
								}
								thisItem.querySelectorAll(".jobControls").forEach((c) => {
									c.visible = false;
									c.remove();
								});

								document.querySelectorAll(".altState").forEach((c) => {
									c.classList.remove("altState");
									c.setAttribute("icon", "plus");
								});

								switch (cmd) {
									case "add": {
										//add doc to ${key}

										let actionbuttons = [];

										app.state.templateList.forEach((t) => {
											if (t.id.length > 4) {
												actionbuttons.push(
													JSON.parse(
														`{ "label": "${t.friendlyName}", "id": "${t.id}" }`
													)
												);
											}
										});

										actionbuttons.push(
											JSON.parse('{ "label": "Cancel", "id": "cancel"}')
										);

										ons
											.openActionSheet({
												id: "b_newdoc",
												title: `${thisDocument.data.title}: New...`,
												cancelable: true,
												buttons: actionbuttons,
											})

											.then(function (index) {
												if (index < 0) {
													// click outside menu (-1) cancels
													return;
												}
												switch (actionbuttons[index].id) {
													case "cancel":
														break;
													default:
														console.debug(
															actionbuttons[index].id +
																" for " +
																thisDocument.id
														);
														document
															.getElementById("rootNavigator")
															.pushPage("tpl_documentRenderer", {
																data: {
																	templateID: actionbuttons[index].id,
																	parentID: thisDocument.id,
																},
															});
												}
											});
										break;
									}
								}
							};

							btn.addEventListener("click", bClickHandler.bind());

							btn.addEventListener("hold", function (ev) {
								//ons.notification.alert(JSON.stringify(app.currentUser));

								btn.classList.toggle("altState");
								if (
									btn.classList.contains("altState") &&
									!thisItem.querySelector(".jobControls")
								) {
									let controls = ons.createElement(
										`<div class="jobControls"></div>`
									);
									//ADD TOPLEVEL DOC CONTROLS
									if (app.currentUser.auth.rules.includes("delete")) {
										let btnAssign = ons.createElement(
											`<ons-button class="deleteButton" icon="fa-trash"></ons-button>`
										);
										btnAssign.addEventListener("click", bClickHandler.bind());
										controls.appendChild(btnAssign);
									}

									if (app.currentUser.auth.rules.includes("assign")) {
										let btnAssign = ons.createElement(
											`<ons-button class="assignButton" icon="fa-user-plus"></ons-button>`
										);
										btnAssign.addEventListener("click", bClickHandler.bind());
										controls.appendChild(btnAssign);
									}

									thisItem.querySelector(".right").insertBefore(controls, btn);

									window.addEventListener("click", () => {
										document.querySelectorAll(".jobControls").forEach((c) => {
											c.visible = false;
											c.remove();
										});
										document.querySelectorAll(".altState").forEach((c) => {
											c.classList.remove("altState");
											c.setAttribute("icon", "plus");
										});
									});
								}
							});
							//Remove Icon -- For Now

							//thisJob.content
							//	.querySelector(".list-item__thumbnail")
							//	.parentNode.remove();

							thisJob.content.querySelector(".list-item__thumbnail").src =
								"images/list_icon.png";

							thisJob.content.querySelector(".list-item__title").innerHTML =
								thisDocument.data.title;

							thisJob.content.querySelector(".list-item__subtitle").innerHTML =
								thisDocument.data.subtitle;

							docList.appendChild(thisJob.content);
						})
						.catch((e) => console.error(e));
				});

				d.children.forEach((a) => {
					sixWestPromiseAPI
						.fetchResource("documents/" + a)
						.then((thisDocument) => {
							thisDocument.createdTimeLocalString = new Date(
								parseInt(thisDocument.createdTimeUTC)
							).toDateString();

							console.log(thisDocument);
							UTIL.waitForDOMId(thisDocument.root_node).then((parentNode) => {
								let thisSubListItem = document
									.getElementById("subdocumentItem")
									.cloneNode(true);
								let thisItem = thisSubListItem.content.querySelector(
									"ons-list-item"
								);

								thisItem.id = thisDocument.id;
								//debugger;
								t = app.state.templateList.find(
									(i) => i.id == thisDocument.template
								);

								thisItem.querySelector(".list-item__title").innerHTML =
									t.friendlyName;

								thisItem.querySelector(".list-item__subtitle").innerHTML =
									thisDocument.author +
									" : " +
									thisDocument.createdTimeLocalString;
								//	thisSubListItem.content.querySelector(".list-item__thumbnail").src =
								//		"images/list_icon.png";
								//thisItem.animation = "fadein 1s ease-in-out;"
								var gestureD = ons.GestureDetector(thisItem);

								gestureD.on("hold click", function (ev) {
									ev.stopPropagation();
									switch (ev.type) {
										case "click": {
											sixWestPromiseAPI
												.fetchResource("templates/" + thisDocument.template)
												.then((e) => console.log(e, thisDocument))

												//debugger;

												//	app.notify("CLICK: <br>" + this.id);
												/* 									FBAbstract.getDocument(this.id)
												.then((thisDocument) => {
													FBAbstract.getTemplate(thisDocument.template).then(
														(t) => {
															thisDocument.template = t;
															if (thisDocument.parent) {
																FBAbstract.getDocument(thisDocument.parent)
																	.then((p) => {
																		thisDocument.parent = p;
																		FBAbstract.getTemplate(
																			thisDocument.parent.template
																		).then((t) => {
																			thisDocument.parent.template = t;
																			console.log(thisDocument);
		
																			thisDocument.createdTimeLocalString = new Date(
																				parseInt(thisDocument.createdTimeUTC)
																			).toDateString();
		
																			thisDocument.id = this.id;
		
																			document
																				.getElementById("rootNavigator")
																				.pushPage("t_docView", {
																					data: thisDocument,
																				});
																		});
																	})
																	.catch((e) => app.notify(e));
															}
														}
													);
												})
												.catch((e) => app.notify(e));
											/// Display DOC ${this.id} */
												.catch((e) => {
													console.error(e);
												});
											break;
										}
										case "hold": {
											console.log("hold");
											break;
										}
										default: {
											console.warn(
												"UnHandled Event: " + ev.type + " : " + this.id
											);
										}
									}
								});

								thisItem.addEventListener("click", (e) =>
									//VIEW
									{
										sixWestPromiseAPI
											.fetchUser(`${thisDocument.author}`)
											.then((t) => {
												thisDocument.authorName = t.name;
												sixWestPromiseAPI
													.fetchResource(`/templates/${thisDocument.template}`)
													.then((t) => {
														thisDocument.templateData = t;

														sixWestPromiseAPI
															.fetchResource(
																`/documents/${thisDocument.root_node}`
															)
															.then((p) => {
																thisDocument.parent = p;
																rootNavigator.pushPage("tpl_docView", {
																	data: thisDocument,
																});
															})
															.catch((e) => console.log(e));
													})
													.catch((e) => console.error(e));
											});
									}
								);

								parentNode.querySelector(".subDocList").appendChild(thisItem);
							});
						})

						.catch((e) => console.error(e));
				});
			}
		});
	},
	renderDocument: function (thisDoc) {
		let cv = ons.createElement(`<div class="printableDocument"></div>`);
		let template = thisDoc.templateData.data;
		debugger;
		cv.innerHTML = `
							<img class="headerIcon">
								<div class="titleBlock">
									<div class="pageFriendlyName">${thisDoc.templateData.friendlyName}</div>
									<div class="pageCreateDate">${thisDoc.createdTimeLocalString}</div>
								</div>
								<div class="subtitleBlock">
								<div class="pageTitle">${thisDoc.parent.data.title}</div> 
								<div class="pageSubTitle">${thisDoc.parent.data.subtitle}</div>
								</div>
								<div class="pageAuthor">Completed by: ${thisDoc.authorName}</div>
								`;

		template.forEach(function (i) {
			//Map Response Values
			i.value = thisDoc.data[i.id];
			if (i.data) {
				i.data.forEach(function (si) {
					si.value = thisDoc.data[si.id];
				});
			}
			//	let thisItem = app.getPrintableControlFromJSON(i);
			//	cv.appendChild(thisItem);
		});

		return cv;
	},
};

ons.ready(() => {
	console.debug("UI Ready");
});
