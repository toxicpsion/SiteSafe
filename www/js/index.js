/* global 
cordova, ons, 
StackTrace, Connection
CordovaPromiseFS, hex_sha1

modal,
FCM
*/

//Included Modules I Use:

//CordovaPromiseFS: MIT Licence - https://github.com/markmarijnissen/cordova-promise-fs
//Sha1: BSD Licence - http://pajhome.org.uk/crypt/md5/
//signature_pad: MIT Licence - https://github.com/szimek/signature_pad

// eslint-disable-next-line no-unused-vars
let rootNavigator;
let SiteSafeAPI = mod_SiteSafeAPI();

/* let __sixWestPromiseAPI = {

	APIServerDefault: "http://artisan.6west.ca:16022",



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
					fetch(`https://sitesafe.6west.ca/user/fetch/${user}`, {
						method: "post",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							username: SiteSafeAPI.user.username,
							passhash: SiteSafeAPI.user.passhash,
							userID: user,
						}),
					})
						.then((r) => r.json())
						.then((data) => {
							resolve(data);
						});
				}
			});
		});
	},
	listUsers: function (params = {}) {
		return new Promise(function (resolve, reject) {
			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);

			sixWestPromiseAPI.isConnected().then((connected) => {
				if (connected) {
					fetch(`https://sitesafe.6west.ca/user/list`, {
						method: "post",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							username: SiteSafeAPI.user.username,
							passhash: SiteSafeAPI.user.passhash,
							params: params,
						}),
					})
						.then((r) => r.json())
						.then((data) => {
							resolve(data);
						})
						.catch((e) => reject(e));
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
							u: SiteSafeAPI.user.username,
							p: SiteSafeAPI.user.passhash,
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
					u: SiteSafeAPI.user.username,
					p: SiteSafeAPI.user.passhash,
					resource: resource,
				}),
			})
				.then((r) => r.json())
				.then((data) => {
					resolve(data);
				});
		});
	},


	getPrintableControlFromJSON: function getPrintableControlFromJSON(obj_JSON) {
		//obj_JSON.desc = obj_JSON.desc ? obj_JSON.desc : "";
		addSubItems = () => {
			thisElement.classList.add("hasSubItems");

			let subControlElement = thisElement.querySelector(".subItems");
			if (!subControlElement) {
				subControlElement = thisElement;
			}
			obj_JSON.data.forEach((subelement) => {
				subControlElement.appendChild(
					sixWestPromiseAPI.getPrintableControlFromJSON(subelement)
				);
			});
		};

		let thisElement = ons.createElement(`<div class="controlItem"></div>`);

		switch (obj_JSON.type) {
			case 0: {
				//LABEL

				if (obj_JSON.text) {
					thisElement.appendChild(
						ons.createElement(`
						<span class="itemHeader">
							${obj_JSON.text}
						</span>`)
					);
				}
				if (obj_JSON.desc) {
					thisElement.appendChild(
						ons.createElement(`
						<span class="itemDesc">
							${obj_JSON.desc}				
						</span>`)
					);
				}

				if (obj_JSON.data) {
					thisElement.appendChild(
						ons.createElement(`<div class="subItems"></div>`)
					);
					addSubItems();
				}

				return thisElement;
			}
			case 1: {
				//RANGE Slider

				thisElement.appendChild(
					ons.createElement(`
					<div class="itemHeader">${obj_JSON.text}
						<div class="itemResponse">${obj_JSON.value}</div>		
					</div>`)
				);
				thisElement.appendChild(
					ons.createElement(`<div class="itemDesc">${obj_JSON.desc}</div>	`)
				);
				return thisElement;
			}

			case 2: {
				//checkbox
				thisElement.appendChild(
					ons.createElement(`
					<div class="ctlCheckBox">
						${
							obj_JSON.value
								? "<ons-icon icon='check-circle'></ons-icon>"
								: "<ons-icon icon='circle'></ons-icon>"
						}	&nbsp;<div class="">${obj_JSON.text}</div>
					</div>`)
				);
				return thisElement;
			}
			case 3: {
				// text input
				thisElement.appendChild(
					ons.createElement(`
					<div class="itemHeader">${obj_JSON.text ? obj_JSON.text + " :" : ""} ${
						obj_JSON.value
					}</div>`)
				);
				return thisElement;
			}
			case 4: {
				thisElement.appendChild(
					ons.createElement(`<div class="itemHeader">${obj_JSON.text}</div>`)
				);
				thisElement.appendChild(
					ons.createElement(
						`<pre>${obj_JSON.value ? obj_JSON.value : "None"}</pre>`
					)
				);
				return thisElement;
			}
			case 5: {
				//UNNASIGNED
				thisElement.appendChild(ons.createElement("<div>[5]</div>"));
				return thisElement;
			}
			case 6: {
				//signature
				let canvas = ons.createElement(` 
				<canvas class="signatureBox"></canvas>`);
				thisElement.appendChild(canvas);

				let signaturePad = new SignaturePad(canvas);
				signaturePad.off();
				// setup pen inking
				signaturePad.minWidth = 0.1;
				signaturePad.maxWidth = 1.6;
				signaturePad.penColor = "blue";
				try {
					signaturePad.fromData(obj_JSON.value);
				} catch {}
				return thisElement;
			}
		}
	},
};
 */

function unifiedFetch(path) {
	function fetchLocal(url) {
		return new Promise(function (resolve, reject) {
			var xhr = new XMLHttpRequest();
			xhr.onload = function () {
				resolve(new Response(xhr.responseText, { status: xhr.status }));
			};
			xhr.onerror = function () {
				reject(new TypeError("Local request failed"));
			};
			xhr.open("GET", url);
			xhr.send(null);
		});
	}

	switch (String(path).substr(0, 8)) {
		case "[ASSET]/": {
			path = String(path).substr(8);
			path = `${SiteSafeAPI.APIServerDefault}/${userdata.provisioning.provider}/${path}`;
		}
		case "https://": {
			return fetch(path);
			break;
		}
		case "[LOCAL]/": {
			path = String(path).substr(8);
			return fetchLocal(cordova.file.applicationDirectory + "www/" + path);
			break;
		}
		default:
			return;
	}
}
let app = {
	pushRemotePage: function pushRemotePage(url) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);

			rootNavigator
				.pushPage(url, { timeout: 2000 })
				.then((e) => {
					resolve(e);
				})
				.catch((e) => {
					reject(e);
				});
		});
	},

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
					SiteSafeAPI.log(logMessage);
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
		if (ons.platform.isIPhoneX()) {
			console.debug("Applying IphoneX css fixes.");
			document.documentElement.setAttribute("onsflag-iphonex-portrait", "");
			document.documentElement.setAttribute("onsflag-iphonex-landscape", "");
		}

		rootNavigator = document.getElementById("rootNavigator");

		cordova.getAppVersion.getVersionNumber().then((version) => {
			app.version = version;
			SiteSafeAPI.log(`deviceReady (${app.version})`);
		});

		SiteSafeAPI.init().then(() => {
			document.addEventListener("init", app.pageInitHandler, false);
			document.addEventListener("show", app.pageShowHandler, false);
			document.addEventListener("hide", app.pageHideHandler, false);

			/////temp
			if (false) {
				app
					.dialogFirstRun({
						auth: { rules: "" },
						name: "",
						notes: "",
						phone: "",
						provisioning: {
							assets: "{}",
							provider: "TPI",
							providerName: null,
							username: "test1@6west.ca",
						},

						reserved: {},
						session: "",
						username: "test1@6west.ca",
					})
					.then((e) => {
						alert("then");
						console.log(e);
						//modal.hide();
					})
					.catch((e) => {});
				return;
			}
			if (!SiteSafeAPI.isLoggedIn) {
				rootNavigator.resetToPage("tpl_loginPage");
			} else {
				rootNavigator.resetToPage("tpl_tabNavigator");
			}
		});

		return;
	},
	pageInitHandler: function (event) {
		console.debug("pageInitHandler stub: " + event.target.id);
		switch (event.target.id) {
			case "p_settings": {
				let list = document.getElementById("l_preferences");
				list.innerHTML = "";

				for (let [key, value] of Object.entries(SiteSafeAPI.preferences)) {
					if (key.charAt(0) == "_") break;

					switch (typeof SiteSafeAPI.preferences[key]) {
						case "boolean": {
							let i = ons.createElement(`
							<ons-list-item>
								<div class="left">
								${SiteSafeAPI.preferences._description[key]}
								</div>
								<div class="right">
								<ons-switch ${value == true ? "checked" : ""}></ons-switch>
								</div>
							   </ons-list-item>`);

							list.appendChild(i);

							i.addEventListener("change", function () {
								SiteSafeAPI.preferences[key] = this.querySelector(
									"ons-switch"
								).checked;
							});

							break;
						}
						case "number": {
							let i = ons.createElement(`
							<ons-list-item tappable>
								<ons-row><ons-col>${SiteSafeAPI.preferences._description[key]}</ons-col><ons-col>
								<ons-range type="number" min="15" max="3600" step="15" value="${value}"></ons-range>
								</ons-col>
								<ons-col class="value">
									${value}
								</ons-col>
								</ons-row>
							   </ons-list-item>`);

							list.appendChild(i);

							i.addEventListener("input", function () {
								SiteSafeAPI.preferences[key] = parseInt(
									this.querySelector("ons-range").value
								);
								this.querySelector(".value").innerHTML =
									SiteSafeAPI.preferences[key];
							});
							/* 							i.addEventListener("change", function () {
								localStorage.setItem("prefs", JSON.stringify(app.preferences));
							}); */
							break;
						}
						default: {
							console.warn(`Unknown Datatype: ${typeof app.preferences[key]}	`);
						}
					}
				}
				break;
			}
			case "p_login": {
				document
					.getElementById("btnLogin")
					.addEventListener("click", async function () {
						modal.show("Validating Credentials");

						switch (
							await SiteSafeAPI.doLogin(
								document.getElementById("username").value,
								document.getElementById("password").value
							)
						) {
							case true: {
								history.pushState({}, "Login Success.");

								rootNavigator.resetToPage("tpl_tabNavigator");

								modal.hide();

								break;
							}
							case false: {
								ons.notification.alert(
									"Check your credentials and try again.",
									{
										title: "Login Failed",
									}
								);
							}
							default: {
								modal.hide(); //or hangs @ validating credentials
							}
						}
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
					`<div class="toolbarUserName right" id="l_userID">${SiteSafeAPI.user.name}</div>`
				);
				let userIcon = ons.createElement(`<img class="toolbarUserIcon">`);
				user.appendChild(userIcon);
				tb.appendChild(user);

				user.onclick = function () {
					rootNavigator.pushPage("tpl_accountPage", {
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
				if (event.target.data.isFirstRun) {
					alert(JSON.stringify(event.target.data));
				} else {
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
							document.querySelector(".topToolbar").style.visibility =
								"visible";
							rootNavigator.popPage();
						});

					cBar.style.visibility = "visible";

					//let page = document.getElementById("p_accountPage");
					let canvas = document.querySelector("#p_accountPage .renderCanvas");

					canvas.innerHTML = `
			<img class="userImage"><br>
			<div>
				<div class="username">${SiteSafeAPI.user.name}</div>
				<div class="email">${SiteSafeAPI.user.username}</div>
			</div>
			<hr>
			<div>${SiteSafeAPI.user.phone || ""}</div><hr>
			<div>Notes:<br>${SiteSafeAPI.user.notes}</div>
			<div style="padding-top: 2em"> 
				<ons-button class="logoutButton" icon="times">&nbsp;Logout</ons-button>
			</div>
			`;
					canvas
						.querySelector(".logoutButton")
						.addEventListener("click", SiteSafeAPI.doLogout);
				}
				break;
			}
			case "p_documents": {
				app.updateDocumentList();
				break;
			}
			case "p_reference": {
				app.updateReferenceList();
				break;
			}
			case "p_docRender": {
				var template;
				console.debug("rendering: ", event.target.data.templateID);
				SiteSafeAPI.templates
					.then((t) => t[event.target.data.templateID])
					.then((a) => {
						SiteSafeAPI.log(`Fetched Template ${event.target.data.templateID}`);

						template = a;
						UTIL.waitForDOMSelector("#p_docRender .renderCanvas").then(
							(canvas) => {
								a.data.forEach((item) => {
									let thisItem = SiteSafeAPI.getFillableControlFromJSON(item);
									thisItem.addEventListener("touchend", function () {
										this.classList.add("hasInteracted");
										this.classList.remove("invalidated");

										this.querySelectorAll(".invalidated").forEach((e) => {
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
							console.log(response.type);
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
									if (
										response.parentNode.parentNode.parentNode.classList.contains(
											"hasInteracted"
										)
									) {
										return true;
									} else {
										response.parentNode.parentNode.classList.add("invalidated");
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
							SiteSafeAPI.log("Loaded Validator from template.");
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

							try {
								if (!thisValidator(response, thisData)) {
									console.debug("Failed Validation", thisData);
									failedValidation = true;

									response.classList.add("invalidated");
								}
							} catch {
								SiteSafeAPI.log(
									"Validator exception." + JSON.stringify([response, thisData])
								);
							}

							switch (response.type) {
								case "text":
								case "textarea": {
									response.value = response.value.trim();
									console.log(response.value);
									thisResp = response.value ? response.value : "";
									break;
								}
								case "checkbox": {
									thisResp = response.checked;
									break;
								}

								default: {
									if (response.classList.contains("signatureBox")) {
										try {
											thisResp = response.getAttribute("data");
											thisResp = JSON.parse(thisResp);
										} catch {
											//Empty Signature?
											thisResp = [];
										}

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

						pendingRequest.meta = {};

						//subfield to root key mapping for title/subtitle etc.

						if (template.mapping) {
							console.log(typeof template.mapping);
							if (typeof template.mapping != "object") {
								template.mapping = JSON.parse(template.mapping);
							}

							for (const key in template.mapping) {
								pendingRequest.meta[key] =
									pendingRequest.data[template.mapping[key]];
							}
						}
						//TODO: [SIT-5] Improve keymapper scope to .state.CurrentUser and .parentFBDoc
						pendingRequest.id = hex_sha1(Date.now() + SiteSafeAPI.myToken);
						pendingRequest.auth = [SiteSafeAPI.user.username];
						pendingRequest.status = 0;

						pendingRequest.meta.author = SiteSafeAPI.user.username;
						pendingRequest.meta.authorName = SiteSafeAPI.user.name;
						pendingRequest.meta.createdTimeUTC = Date.now();

						pendingRequest.template = event.target.data.templateID;
						pendingRequest.rootNode = event.target.data.parentID;

						if (!failedValidation) {
							//TODO: [SIT-4] Add Multiple Root Template Support
							//if (event.target.data.templateID < 100) {
							if (true) {
								SiteSafeAPI.putDocument(pendingRequest)
									.then((e) => {
										if (e.status == 202) {
											SiteSafeAPI.log("Created document:");

											rootNavigator.popPage();
										} else {
										}
									})
									.catch((e) => {
										alert("put failed");
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
				if (SiteSafeAPI.user.auth.rules.includes("delete")) {
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
							SiteSafeAPI.log("Printing: " + event.target.data);

							cBar.innerHTML = "";
							cBar.style.visibility = "hidden";
							document.getElementById("rootNavigator").popPage();
						});
					});

				cBar.style.visibility = "visible";

				let canvas = document
					.getElementById("p_docView")
					.querySelector(".renderCanvas");

				canvas.appendChild(app.renderDocument(event.target.data));

				break;
			}
			default: {
				//
			}
		}
	},
	pageHideHandler: function (event) {
		console.debug("pageShowHandler stub: " + event.target.id);
		switch (event.target.id) {
			case "p_settings": {
				location.reload();
				break;
			}
			default: {
			}
		}
	},
	updateReferenceList: function updateReferenceList() {
		let refList = document.getElementById("l_reference");

		SiteSafeAPI.listResource("reference").then((resourceList) => {
			return;
			debugger;
			let newResources = UTIL.getNewObjectKeys(
				resourceList,
				app.state.referenceList
			);

			let removedResources = UTIL.getNewObjectKeys(
				app.state.referenceList,
				resourceList
			);

			app.state.referenceList = resourceList;

			if (Object.keys(removedResources).length) {
				for (const key in removedResources) {
					document.getElementById(removedResources[key].id).remove();
					//delete app.state.documents[key]
				}
			} else {
				console.log("NoUpdates()");
			}

			if (Object.keys(newResources).length) {
				debugger;
			}

			resourceList.forEach((i) => {
				console.log(i);
				let thisJobItem = document
					.getElementById("documentItem")
					.cloneNode(true);

				thisJob = thisJobItem.content.querySelector("ons-list-item");

				thisJob.querySelector(".list-item__thumbnail").src =
					"images/list_icon.png";

				thisJob.querySelector(".list-item__title").innerHTML = i.title;

				thisJob.querySelector(".list-item__subtitle").innerHTML = i.subtitle;

				thisJob.addEventListener("click", (e) => {
					rootNavigator.pushPage(i.url);
				});

				refList.appendChild(thisJob);
			});
		});
	},
	updateDocumentList: async function () {
		let docList = document.getElementById("documentList");

		//Bottom Create/Manage Action Bar
		if (!document.getElementById("d_actionStrip")) {
			let d_actionStrip = ons.createElement('<div id="d_actionStrip"></div>');

			if (SiteSafeAPI.user.auth.rules.includes("create")) {
				let b_CreateNew = ons.createElement(
					'<ons-button icon="plus"><span>Create New</span></ons-button>'
				);
				b_CreateNew.addEventListener(
					"click",
					function () {
						SiteSafeAPI.templates.then((tpl) => {
							let actionbuttons = [];

							for (const key in tpl) {
								if (Object.hasOwnProperty.call(tpl, key)) {
									const t = tpl[key];
									if (t.id.length <= 4) {
										actionbuttons.push(
											JSON.parse(
												`{ "label": "${t.meta.title}", "id": "${t.id}" }`
											)
										);
									}
								}
							}

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
						});
					},
					false
				);
				d_actionStrip.append(b_CreateNew);
			}

			if (SiteSafeAPI.user.auth.rules.includes("admin")) {
				let b_manageDocs = ons.createElement(
					'<ons-button icon="key"><span>Manage</span></ons-button>'
				);
				b_manageDocs.addEventListener(
					"click",
					() => {
						app
							.pushRemotePage("https://sitesafe.6west.ca/user/debuglist")
							.catch((e) => {
								alert("Resource Unavailable");
							});
					},
					false
				);
				d_actionStrip.append(b_manageDocs);
			}

			docList.parentNode.append(d_actionStrip);
		}

		if (SiteSafeAPI.isLoggedIn) {
			SiteSafeAPI.changed_documents.then((docs) => {
				if (Object.keys(docs.removed).length) {
					for (const key in docs.removed) {
						document.getElementById(docs.removed[key].id).remove();
						//delete app.state.documents[key]
					}
				}

				if (Object.keys(docs.added).length) {
					let localDocs = SiteSafeAPI.documents;

					let d = {};
					d.toplevel = [];
					d.children = [];

					for (const key in docs.added) {
						i = docs.added[key];
						if (i.rootNode.length <= 4) {
							d.toplevel.push(i.id);
						} else {
							d.children.push(i.id);
						}
					}

					d.toplevel.forEach((toplevelDocID) => {
						if (document.getElementById(toplevelDocID)) return; //Skip Dupes

						let tDoc = UTIL.cloneObject(localDocs[toplevelDocID]);

						tDoc.createdTimeLocalString = new Date(
							parseInt(tDoc.meta.createdTimeUTC)
						).toDateString();

						let thisJob = document
							.getElementById("documentItem")
							.cloneNode(true).content;

						console.debug("adding Listitem >>", tDoc);

						let thisListItem = thisJob.querySelector("ons-list-item");
						thisListItem.id = tDoc.id;

						let itemControls = thisListItem.querySelector(".controlArea");

						let btn = ons.createElement(
							`<ons-button class="addButton" icon="fa-plus"></ons-button>`
						);

						itemControls.appendChild(btn);

						var bClickHandler = function (event) {
							//	thisItem.toggleAttribute("expandable");

							//thisItem.querySelector('.expandable-content').remove()

							event.stopPropagation();
							let thisListItemClassList = event.target.classList;

							if (event.target.classList.contains("ons-icon"))
								//got the icon, find parent
								thisListItemClassList = event.target.parentNode.classList;

							let cmd = "";
							if (thisListItemClassList.contains("addButton")) cmd = "add";
							if (thisListItemClassList.contains("printButton")) cmd = "print";
							if (thisListItemClassList.contains("assignButton"))
								cmd = "assign";
							if (thisListItemClassList.contains("deleteButton"))
								cmd = "delete";

							if (thisListItemClassList.contains("altState")) {
								cmd = "alt_" + cmd;
							}
							thisListItem.querySelectorAll(".jobControls").forEach((c) => {
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
									SiteSafeAPI.templates.then((tpl) => {
										let actionbuttons = [];

										for (const k in tpl) {
											if (Object.hasOwnProperty.call(tpl, k)) {
												const t = tpl[k];
												if (t.id.length > 4) {
													actionbuttons.push(
														JSON.parse(
															`{ "label": "${t.meta.title}", "id": "${t.id}" }`
														)
													);
												}
											}
										}

										actionbuttons.push(
											JSON.parse('{ "label": "Cancel", "id": "cancel"}')
										);

										ons
											.openActionSheet({
												id: "b_newdoc",
												title: `${
													localDocs[thisListItem.id].meta.title
												}: New...`,
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
																thisListItem.id
														);

														document
															.getElementById("rootNavigator")
															.pushPage("tpl_documentRenderer", {
																data: {
																	templateID: actionbuttons[index].id,
																	parentID: thisListItem.id,
																},
															});
												}
											});
									});
									break;
								}
								case "assign": {
									app.assignDocument(SiteSafeAPI.documents[thisListItem.id]);
									break;
								}
							}
						};

						btn.addEventListener("click", bClickHandler.bind());

						btn.addEventListener("hold", function (ev) {
							//ons.notification.alert(JSON.stringify(SiteSafeAPI.user));

							btn.classList.toggle("altState");
							if (
								btn.classList.contains("altState") &&
								!thisListItem.querySelector(".jobControls")
							) {
								let controls = ons.createElement(
									`<div class="jobControls"></div>`
								);
								//ADD TOPLEVEL DOC CONTROLS
								if (SiteSafeAPI.user.auth.rules.includes("delete")) {
									let btnAssign = ons.createElement(
										`<ons-button class="deleteButton" icon="fa-trash"></ons-button>`
									);
									btnAssign.addEventListener("click", bClickHandler.bind());
									controls.appendChild(btnAssign);
								}

								if (SiteSafeAPI.user.auth.rules.includes("assign")) {
									let btnAssign = ons.createElement(
										`<ons-button class="assignButton" icon="fa-user-plus"></ons-button>`
									);
									btnAssign.addEventListener("click", bClickHandler.bind());
									controls.appendChild(btnAssign);
								}

								thisListItem
									.querySelector(".right")
									.insertBefore(controls, btn);

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

						thisJob.querySelector(".list-item__thumbnail").src =
							"images/list_icon.png";

						thisJob.querySelector(".list-item__title").innerHTML =
							tDoc.meta.title;

						thisJob.querySelector(
							".list-item__subtitle"
						).innerHTML = `${tDoc.meta.subtitle}`;

						docList.appendChild(thisJob);
					});

					d.children.forEach((thisChildDocID) => {
						if (document.getElementById(thisChildDocID)) return; //Skip Dupes

						let tDoc = UTIL.cloneObject(localDocs[thisChildDocID]);

						tDoc.createdTimeLocalString = new Date(
							parseInt(tDoc.meta.createdTimeUTC)
						).toDateString();

						UTIL.waitForDOMId(tDoc.rootNode).then((pNode) => {
							let thisSubListItem = document
								.getElementById("subdocumentItem")
								.cloneNode(true).content;

							let thisItem = thisSubListItem.querySelector("ons-list-item");

							thisItem.id = tDoc.id;

							SiteSafeAPI.templates
								.then((tpl) => {
									t = tpl[tDoc.template];

									thisItem.querySelector(".list-item__title").innerHTML = tDoc
										.meta.title
										? `${t.meta.title}: ${tDoc.meta.title}`
										: t.meta.title;

									thisItem.querySelector(
										".list-item__subtitle"
									).innerHTML = `${tDoc.meta.authorName}: ${tDoc.createdTimeLocalString}`;

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
													.then((e) => console.warn(e, thisDocument))

													//;

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
												SiteSafeAPI.log(
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
														.fetchResource(
															`/templates/${thisDocument.template}`
														)
														.then((t) => {
															thisDocument.templateData = t;

															sixWestPromiseAPI
																.fetchResource(
																	`/documents/${thisDocument.root_node}`
																)
																.then((p) => {
																	thisDocument.parentNode = p;
																	rootNavigator.pushPage("tpl_docView", {
																		data: thisDocument,
																	});
																})
																.catch((e) => SiteSafeAPI.log(e));
														})
														.catch((e) => console.error(e));
												});
										}
									);
									pNode.querySelector(".subDocList").appendChild(thisItem);
								})
								.catch();
						});
					});
				}
			});
		} else {
			console.log("NOTLOGGED");
		}
	},
	renderDocument: function (thisDoc) {
		let cv = ons.createElement(`<div class="printableDocument"></div>`);
		let template = thisDoc.templateData.data;
		cv.innerHTML = `
							<img class="headerIcon">
								<div class="titleBlock">
									<div class="pageFriendlyName">${thisDoc.templateData.friendlyName}</div>
									<div class="pageCreateDate">${thisDoc.createdTimeLocalString}</div>
								</div>
								<div class="subtitleBlock">
								<div class="pageTitle">${thisDoc.parentNode.data.title}</div> 
								<div class="pageSubTitle">${thisDoc.parentNode.data.subtitle}</div>
								</div>
								<div class="pageAuthor">Completed by: ${thisDoc.authorName}</div>
								`;

		console.log(thisDoc.data);
		console.log(template);
		template.forEach(function (i) {
			//Map Response Values
			i.value = thisDoc.data[i.id];
			if (i.data) {
				i.data.forEach(function (si) {
					si.value = thisDoc.data[si.id];
				});
			}
			let thisItem = sixWestPromiseAPI.getPrintableControlFromJSON(i);
			cv.appendChild(thisItem);
		});

		return cv;
	},
	assignDocument: function (thisDoc) {
		//Remove old List if exists
		debugger;
		var dialog = document.getElementById("my-alert-dialog");
		if (dialog) {
			dialog.remove();
		}

		dialog = ons.createElement(
			`<ons-alert-dialog id="my-alert-dialog" modifier="rowfooter">
								<div class="alert-dialog-title">Assign users</div>
								<div class="alert-dialog-content">
								</div>
								<div class="alert-dialog-footer">
									<ons-alert-dialog-button onclick="
									document
										.getElementById('my-alert-dialog')
										.hide();
									">Cancel</ons-alert-dialog-button>
									<ons-alert-dialog-button class="OKbutton">OK</ons-alert-dialog-button>
								</div>
							</ons-alert-dialog>`,
			{ append: true }
		);

		let dContent = document.querySelector(".alert-dialog-content");
		let userTable = ons.createElement(
			`<ons-list modifier="inset" class="assignUserList"></ons-list>`
		);

		SiteSafeAPI.listUsers().then((users) => {
			debugger;
			users.forEach((user) => {
				let row = document.getElementById("genericListItem").cloneNode(true);

				row.content.querySelector(".list-item__thumbnail").parentNode.remove();

				row.content.querySelector(".list-item__title").innerHTML = user.name
					? user.name
					: user.username;

				//beware: leave this subtitle; it is used to map back on submit.
				row.content.querySelector(".list-item__subtitle").innerHTML =
					user.username;

				if (thisDoc.auth.includes(user.username)) {
					row.content
						.querySelector("ons-list-item")
						.classList.add("userIsSelected");
				}
				userTable.appendChild(row.content);
			});

			dContent.appendChild(userTable);

			userTable.querySelectorAll("ons-list-item").forEach((u) => {
				u.addEventListener("click", function () {
					this.classList.toggle("userIsSelected");
				});
			});

			dialog.querySelector(".OKbutton").addEventListener("click", () => {
				let updateRequest = { assigned: [] };

				userTable.querySelectorAll(".userIsSelected").forEach((u) => {
					updateRequest.assigned.push(
						u.querySelector(".list-item__subtitle").innerText //is userID.
					);
				});

				let newDoc = UTIL.cloneObject(thisDoc);
				newDoc.auth = updateRequest.assigned.join(" ");

				SiteSafeAPI.putDocument(newDoc)
					.then((e) => {
						if (e.status == 202) {
							SiteSafeAPI.log("Updated document:");
							//putDocument removes from cache, so remove list item
							document.getElementById(newDoc.id).remove();
							//and then update.
							app.updateDocumentList();

							dialog.hide();
						} else {
						}
					})
					.catch((e) => {
						alert("put failed");
					});
			});
		});

		dialog.show();
	},
	dialogFirstRun: function (userdata) {
		return new Promise(function (resolve, reject) {
			Keyboard.hide();

			var dialog = document.getElementById("my-alert-dialog");
			if (dialog) {
				dialog.remove();
			}

			dialog = ons.createElement(
				`<ons-alert-dialog id="my-alert-dialog">
								<div class="alert-dialog-title">Welcome to SiteSafe!</div>
								<div id="myDialogContent" class="alert-dialog-content">
								</div>
								<div class="alert-dialog-footer">
								<ons-alert-dialog-button class="cancelButton">Cancel</ons-alert-dialog-button>
								<ons-alert-dialog-button class="nextButton">Next</ons-alert-dialog-button>

									<ons-alert-dialog-button class="prevButton">Previous</ons-alert-dialog-button>
									
								</div>
							</ons-alert-dialog>`,
				{ append: true }
			);

			document.querySelector(".alert-dialog").style.width = "90vw";
			document.getElementById("myDialogContent").style.height = "70vh";
			dialog.show();

			let nextPageClick = function (p, i, e) {
				dialogLoadPage(p, i);
			};

			let prevPageClick = function (p, i, e) {
				dialogLoadPage(p, i);
			};

			let dialogLoadPage = function (page, index) {
				unifiedFetch(page)
					.then((d) => d.text())

					.then((d) => {
						for (const k in SiteSafeAPI.user) {
							const element = SiteSafeAPI.user[k];
							if (typeof element == "string") {
								dt = d.replace(`%${k}%`, `${element}`);
								d = dt;
							}

							if (typeof element == "object") {
								for (const k2 in element) {
									const subelement = element[k2];
									dt = d.replace(`%${k}.${k2}%`, `${subelement}`);
									d = dt;
								}
							}
						}
						return d;
					})
					.then((d) => {
						d = `<div class="forceScrollBar" style="
						">${d}</div>`;
						return d;
					})
					.then((d) => {
						loadedContent = ons.createElement(d);

						try {
							let dTitle = loadedContent.querySelector(".dialogTitle")
								.innerHTML;
							document.querySelector(".alert-dialog-title").innerHTML = dTitle;
						} catch {}

						dContent = document.getElementById("myDialogContent");
						dContent.style.border = "1px solid lightgrey";
						dContent.style.borderRadius = "10px";

						dContent.style.margin = "10px";
						dContent.innerHTML = "";

						dContent.appendChild(loadedContent);

						if (
							index >=
							SiteSafeAPI.user.provisioning.providerData.firstRun.length
						) {
							document
								.querySelector(".alert-dialog-footer .nextButton")
								.classList.add("isdisabled");
						} else {
							document
								.querySelector(".alert-dialog-footer .nextButton")
								.classList.remove("isdisabled");

							document
								.querySelector(".alert-dialog-footer .nextButton")
								.addEventListener(
									"click",
									nextPageClick.bind(
										e,
										`${SiteSafeAPI.APIServerDefault}/${SiteSafeAPI.user.provisioning.provider}/${SiteSafeAPI.user.provisioning.providerData.firstRun[index]}`,
										index + 1
									),
									{ once: true }
								);
						}

						if (index == 0) {
							document
								.querySelector(".alert-dialog-footer .prevButton")
								.classList.add("isdisabled");
						} else if (index == 1) {
							document
								.querySelector(".alert-dialog-footer .prevButton")
								.classList.remove("isdisabled");

							document
								.querySelector(".alert-dialog-footer .prevButton")
								.addEventListener(
									"click",
									prevPageClick.bind(e, "[LOCAL]/eula.html", 0),
									{ once: true }
								);
						} else {
							document
								.querySelector(".alert-dialog-footer .prevButton")
								.classList.remove("isdisabled");

							document
								.querySelector(".alert-dialog-footer .prevButton")
								.addEventListener(
									"click",
									prevPageClick.bind(
										e,
										`${SiteSafeAPI.APIServerDefault}/${
											SiteSafeAPI.user.provisioning.provider
										}/${
											SiteSafeAPI.user.provisioning.providerData.firstRun[
												index - 1
											]
										}`,
										index - 1
									),
									{ once: true }
								);
						}
					});
			};

			dialogLoadPage("[LOCAL]/eula.html", 0);

			document.querySelector(".cancelButton").addEventListener(
				"click",
				function () {
					dialog.hide();
					reject("CANCEL");
				},
				{ once: true }
			);
		});
	},
};

ons.ready(() => {
	console.debug("UI Ready");
});
