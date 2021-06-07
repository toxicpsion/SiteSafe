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
let inAppBrowserHandle;

function htmlSubmit(document, e) {
	var thisRequest = {};

	document.forEach((i) => {
		if (i.value.substr(0, 1) == "$") {
			i.value = Function("return " + i.value.substr(1))();
		}
		if (i.name.substr(0, 1) == "#") {
			item = i.name.substr(1).split(":")[0];
			switch (item) {
				case "request": {
					key = i.name.split(":")[1];
					if (key.substr(0, 1) == "@") {
						key = key.substr(1);

						if (typeof thisRequest[key] != "object") thisRequest[key] = {};

						thisRequest[key][i.name.split(":")[2]] = i.value;
					} else {
						thisRequest[key] = i.value;
					}
				}
			}
		}
	});
	//thisRequest.data = undefined;
	console.log(thisRequest);
	fetch(
		`${SiteSafeAPI.APIServerDefault}${
			thisRequest.data.api_endpoint ? thisRequest.data.api_endpoint : "/log"
		}`,
		{
			method: "post",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(thisRequest),
		}
	)
		.then((r) => r.json())
		.then((data) => {
			alert(data);
		});
}

function unifiedFetch(path) {
	function fetchLocal(url) {
		return new Promise(function (resolve, reject) {
			let wd = setTimeout(() => {
				alert("timed out waiting for local file");
				reject();
			}, 5000);

			window.requestFileSystem(
				LocalFileSystem.PERSISTENT,
				0,
				(fs) => {
					window.resolveLocalFileSystemURL(
						cordova.file.applicationDirectory + "www/" + path,
						(fileEntry) => {
							alert("got filesystem");
							fileEntry.file(
								function (fileEntry) {
									alert("got file");
									var reader = new FileReader();
									reader.onloadend = function () {
										alert("finished loadfile");

										clearTimeout(wd);
										resolve(this.result);
									};
									reader.readAsText(fileEntry);
								},
								(e) => reject(e)
							);
						},
						console.warn
					);
				},
				(e) => reject(e)
			);

			return;
		});
	}

	switch (String(path).substr(0, 8)) {
		case "[ASSET]/": {
			path = String(path).substr(8);
			path = `${SiteSafeAPI.APIServerDefault}/${SiteSafeAPI.user.provisioning.provider}/${path}`;
			//Fixup Path with provider info, and fall though
		}
		case "https://": {
			d = fetch(path)
				.then((d) => d.text())
				.catch((e) => alert(e));

			return d;
			break;
		}
		case "[LOCAL]/": {
			path = String(path).substr(8);

			return fetchLocal(path);
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
								SiteSafeAPI.preferences[key] =
									this.querySelector("ons-switch").checked;
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
			case "p_docView": {
				debugger;
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
						`<ons-button class="shareButton" icon="share"></ons-button>`
					)
				);
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
					.querySelector(".shareButton")
					.addEventListener("click", function () {
						thisDocURL = `https://sitesafe.6west.ca/resource/${SiteSafeAPI.localState.provisioning.provider}/${event.target.data.id}`;
						debugger;

						try {
							document.querySelector("ons-alert-dialog").remove();
						} catch {}

						dialog = ons.createElement(
							`<ons-alert-dialog id="my-alert-dialog">
								<div class="alert-dialog-title">Share...</div>
								<div class="alert-dialog-content" style="text-align: center"><div style="align: center; display: inline-block; width: 192; height:192;" id="qrcode"></div>PermaLink</div>
								<div class="alert-dialog-footer">
								<ons-alert-dialog-button class="dialogOpenButton" onclick="dialog.hide(); dialog.remove(); cordova.InAppBrowser.open('${thisDocURL}', '_system')">Open...</ons-alert-dialog-button>
									<ons-alert-dialog-button class="dialogCancelButton" onclick="dialog.hide(); dialog.remove();">Close</ons-alert-dialog-button>
								</div>
							</ons-alert-dialog>`,
							{ append: true }
						);
						var qrcode = new QRCode(document.getElementById("qrcode"), {
							text: thisDocURL,
							width: 192,
							height: 192,
							colorDark: "#000000",
							colorLight: "#ffffff",
							correctLevel: QRCode.CorrectLevel.H,
						});
						dialog.show();
					});

				cBar
					.querySelector(".printButton")
					.addEventListener("click", function () {
						console.log(event.target.data);

						let toPrint = document
							//.getElementById("p_docView")
							.querySelector(".printableDocument").innerHTML;
						toPrint =
							"<html><body><link rel='stylesheet' href='css/style.css' />" +
							toPrint +
							"</body></html>";

						cordova.plugins.printer.print(toPrint, { margin: true }, (res) => {
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
						`<ons-button class="editButton" icon="edit">&nbsp;Edit</ons-button>`
					)
				);
				cBar
					.querySelector(".cancelButton")
					.addEventListener("click", function () {
						cBar.style.visibility = "hidden";
						cBar.innerHTML = "";
						document.querySelector(".topToolbar").style.visibility = "visible";
						rootNavigator.popPage();
					});

				cBar.querySelector(".editButton").addEventListener("click", () => {
					debugger;
					let t = UTIL.cloneObject(SiteSafeAPI.user);
					SiteSafeAPI.provisioning.then((provis) => {
						t.provisioning = provis;
						app
							.parsedDialogForm(
								`${SiteSafeAPI.APIServerDefault}/confirmAccount.html`,
								t
							)
							.then(() => {
								cBar.style.visibility = "hidden";
								cBar.innerHTML = "";
								document.querySelector(".topToolbar").style.visibility =
									"visible";
								rootNavigator.popPage();
							})
							.catch(() => {
								//clicked Cancel?
								//alert("catch?!!");
							});
					});
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
				${
					SiteSafeAPI.user.auth.rules.includes("admin")
						? `<ons-button icon="new" class="btnCreateUser">&nbsp;Create User</ons-button>`
						: ""
				}
			</div>
			`;
				canvas
					.querySelector(".logoutButton")
					.addEventListener("click", SiteSafeAPI.doLogout);
				try {
					if (SiteSafeAPI.user.auth.rules.includes("admin")) {
						canvas
							.querySelector(".btnCreateUser")
							.addEventListener("click", () => {
								app.parsedDialogForm(
									`${SiteSafeAPI.APIServerDefault}/createUser.html`,
									t
								);
							});
					}
				} catch {}

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
								canvas.classList.add("fillableDocument");
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
							debugger;
							console.log("item: ", templateItem);
							console.log("resp: ", response);
							console.log("rt", response.type);
							console.log("---");
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
											response.parentNode.classList.add("invalidated");
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
						console.log("Validating");

						responses.forEach((response) => {
							debugger;
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

								if (urgentAlert) {
									alert("Urgent Alert.");
									debugger;
								}
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
							// Failed Validation
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
						console.log(event.target.data);

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
				debugger;
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
			//debugger;
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
				//debugger;
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
						inAppBrowserHandle = cordova.InAppBrowser.open(
							"http://sitesafe.6west.ca/resource/test",
							"_blank",
							"location=yes,hidden=yes,beforeload=yes"
						);

						inAppBrowserHandle.addEventListener("loadstart", () => {
							modal.show("Loading...");
						});
						inAppBrowserHandle.addEventListener("loadstop", () => {
							if (inAppBrowserHandle != undefined) {
								inAppBrowserHandle.insertCSS({
									code: "body{font-size: 25px;}",
								});

								inAppBrowserHandle.executeScript({
									code: "\
									var somevar='TESTTEST';\
										var message = 'this is the message';\
										var messageObj = {my_message: message};\
										var stringifiedMessageObj = JSON.stringify(messageObj);\
										webkit.messageHandlers.cordova_iab.postMessage(stringifiedMessageObj);",
								});

								inAppBrowserHandle.show();
								modal.hide();
							}
						});

						inAppBrowserHandle.addEventListener("loaderror", (params) => {
							modal.hide();

							var scriptErrorMesssage =
								"alert('Sorry we cannot open that page. Message from the server is : " +
								params.message +
								"');";

							inAppBrowserHandle.executeScript(
								{ code: scriptErrorMesssage },
								(params) => {
									if (params[0] == null) {
										modal.show(
											"Sorry we couldn't open that page. Message from the server is : '" +
												params.message +
												"'"
										);
									}
								}
							);

							inAppBrowserHandle.close();

							inAppBrowserHandle = undefined;
						});

						inAppBrowserHandle.addEventListener(
							"beforeload",
							(params, callback) => {
								if (params.url.startsWith("https://sitesafe.6west.ca/")) {
									// Load this URL in the inAppBrowser.
									callback(params.url);
								} else {
									// The callback is not invoked, so the page will not be loaded.
									alert("This browser only opens pages on http://*");
								}
							}
						);

						inAppBrowserHandle.addEventListener("message", (message) => {
							ons.notification.toast(message.data.my_message, {
								timeout: 2000,
							});
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
				console.log(docs);
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

												//Add Template visibility Validation Here.
												if (t.id.length > 4 && t.enabled) {
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

						if (SiteSafeAPI.user.auth.rules.includes("admin")) {
						} else {
							if (!tDoc.auth.includes(SiteSafeAPI.user.username)) {
								try {
									thisListItem.classList.add("hidden");
								} catch {}
							}

							if(tDoc.status !=0) {
								try {
									thisListItem.classList.add("hidden");
								} catch {}
							}
						}

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
									debugger;
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
												SiteSafeAPI.templates.then((e) => {
													console.log(e);
													//tDoc
													debugger;
													//	tDoc.template = e[tDoc.template];

													document
														.getElementById("rootNavigator")
														.pushPage("tpl_docView", {
															data: tDoc,
														});
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

		let template = SiteSafeAPI.localState.templates[thisDoc.template];
		if (!template) {
			alert("template Error in document");
		}
		debugger;
		cv.innerHTML = `
							<img class="headerIcon">
								<div class="titleBlock">
									<div class="pageFriendlyName">${template.meta.title}</div>
									<div class="pageCreateDate">${thisDoc.createdTimeLocalString}</div>
								</div>
								<div class="subtitleBlock">
								<div class="pageTitle">${""}</div> 
								<div class="pageSubTitle">${""}</div>
								</div>
								<div class="pageAuthor">Completed by: ${thisDoc.meta.authorName}</div>
								`;

		console.log(thisDoc.data);
		console.log(template);

		template.data.forEach(function (i) {
			//Map Response Values
			i.value = thisDoc.data[i.id];
			if (i.data) {
				i.data.forEach(function (si) {
					si.value = thisDoc.data[si.id];
				});
			}

			let thisItem = SiteSafeAPI.getPrintableControlFromJSON(i);
			if (i.pageBreak) {
				cv.appendChild(
					ons.createElement("<p style='page-break-before: always'></p>")
				);
			}
			cv.appendChild(thisItem);
		});

		return cv;
	},
	assignDocument: function (thisDoc) {
		//Remove old List if exists
		//debugger;
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
			//debugger;
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
	parsedDialogForm: function (formName, formData = {}) {
		return new Promise(function (resolve, reject) {
			//Keyboard.hide();

			debugger;
			unifiedFetch(formName)
				.then((d) => {
					//	alert(d);
					//regex %VAR% to key/values in formData
					for (const k in formData) {
						const element = formData[k];
						if (typeof element == "string") {
							rep = new RegExp(`%${k}%`, "g");

							d = String(d).replace(rep, `${element}`);
						}

						if (typeof element == "object") {
							for (const k2 in element) {
								const subelement = element[k2];
								if (typeof subelement == "string") {
									rep2 = new RegExp(`%${k}.${k2}%`, "g");

									d = String(d).replace(rep2, subelement);
								}
							}
						}
					}
					return d;
				})
				.then((d) => {
					//wrap in scrollable
					d = `<div class="forceScrollBar">${d}</div>`;
					return d;
				})
				.then((d) => {
					loadedContent = ons.createElement(d); //load for preprocess

					try {
						document.querySelector("ons-alert-dialog").remove();
					} catch {}

					dialog = ons.createElement(
						`<ons-alert-dialog id="my-alert-dialog">
							<div class="alert-dialog-title"></div>
							<div class="alert-dialog-content"></div>
							<div class="alert-dialog-footer">
								<ons-alert-dialog-button class="dialogCancelButton">Cancel</ons-alert-dialog-button>
								<ons-alert-dialog-button class="dialogActionButton">Next</ons-alert-dialog-button>	
							</div>
						</ons-alert-dialog>`,
						{ append: true }
					);
					dialog.querySelector(".alert-dialog").style.width = "90vw";

					dialog.querySelector(".alert-dialog-title").style.width = "80vw";
					dialog.querySelector(".alert-dialog-title").style.display = "flex";
					dialog.querySelector(".alert-dialog-title").style.justifyContent =
						"space-between";

					//dialog.title
					try {
						dialog.querySelector(".alert-dialog-title").innerHTML =
							loadedContent.querySelector(".dialog_title").innerHTML;
					} catch {}

					//btnNext caption
					try {
						document.querySelector(
							".alert-dialog-footer .dialogActionButton"
						).innerHTML = loadedContent.querySelector(
							".dialog_actionButton"
						).innerHTML;
					} catch {}

					dContent = dialog.querySelector(".alert-dialog-content");
					dContent.style.border = "1px solid lightgrey";
					dContent.style.borderRadius = "10px";

					dContent.style.margin = "10px";
					dContent.innerHTML = "";

					dContent.appendChild(loadedContent);

					dialog.querySelector(".dialogCancelButton").onclick = function () {
						dialog.hide();
						reject("CANCEL");
					};

					dialog.querySelector(
						".alert-dialog-footer .dialogActionButton"
					).onclick = function () {
						dContent.querySelectorAll("input").forEach((input) => {
							switch (input.name) {
								case "dialog_action": {
									switch (input.value.substr(0, 1)) {
										case "@": {
											//Chain Promise to next Dialog
											//debugger;
											resolve(
												app.parsedDialogForm(input.value.substr(1), formData)
											);
											break;
										}
										case "!": {
											var thisRequest = {};

											dContent.querySelectorAll("input").forEach((i) => {
												if (i.value.substr(0, 1) == "$") {
													i.value = Function("return " + i.value.substr(1))();
												}
												if (i.name.substr(0, 1) == "#") {
													item = i.name.substr(1).split(":")[0];
													switch (item) {
														case "request": {
															key = i.name.split(":")[1];
															if (key.substr(0, 1) == "@") {
																key = key.substr(1);

																if (typeof thisRequest[key] != "object")
																	thisRequest[key] = {};

																thisRequest[key][i.name.split(":")[2]] =
																	i.value;
															} else {
																thisRequest[key] = i.value;
															}
														}
													}
												}
											});
											//thisRequest.data = undefined;

											passwords = document.getElementsByName("password");

											let ptemp = [];
											for (const key in passwords) {
												i = passwords[key];

												if (i.localName == "input") {
													ptemp.push(i);
												}
											}
											passwords = ptemp;

											if (
												passwords.length == 0 ||
												passwords[0].value == passwords[1].value
											) {
												if (passwords.length != 0) {
													if (passwords[0].value == "") {
														alert("Password cannot be blank.");
														return;
													}
													if (passwords[0].value != passwords[1].value) {
														alert("The entered passwords do not match..");
														return;
													}

													thisRequest.passhash = hex_sha1(passwords[0].value);
												}

												fetch(
													`${SiteSafeAPI.APIServerDefault}${
														input.value ? input.value.substr(1) : "/log"
													}`,
													{
														method: "post",
														headers: {
															"Content-Type": "application/json",
														},
														body: JSON.stringify(thisRequest),
													}
												)
													.then((r) => {
														if (r.status == 201) {
															debugger;
															SiteSafeAPI.localState.provisioning =
																formData.provisioning;

															SiteSafeAPI.localState.user = thisRequest;
															SiteSafeAPI.localState.user.data = null;
															delete SiteSafeAPI.localState.user.data;

															SiteSafeAPI.fs
																.write(
																	"userProfile",
																	JSON.stringify(SiteSafeAPI.localState.user)
																)
																.then((e) => {
																	console.debug("Saved User", e);
																})
																.catch((e) =>
																	console.warn("Error Writing User")
																)
																.finally(() => {
																	SiteSafeAPI.fs
																		.write(
																			"provisioning",
																			JSON.stringify(
																				SiteSafeAPI.localState.provisioning
																			)
																		)
																		.then((e) =>
																			console.debug("Saved Provisioning", e)
																		)
																		.catch((e) =>
																			console.warn("Error Writing Provisioning")
																		)
																		.finally(() => {
																			resolve(true);

																			dialog.hide();
																			//debugger;
																			location.reload();
																		});
																});
														} else {
															resolve(false);
														}
													})

													.catch((e) => {
														//debugger;
														resolve(false);
													});

												//
											} else {
												alert("Password Mismatch");
											}
										}
										default:
									}
								}
								default:
							}
						});
					};
					dialog.show();
				});
		});
	},
};

ons.ready(() => {
	console.debug("UI Ready");
});
