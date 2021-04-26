const mod_SiteSafeAPI = () => {
	const APIServerDefault = "https://sitesafe.6west.ca";
	let _pingWorker;

	const fs = new CordovaPromiseFS({
		persistent: true, // or false
		storageSize: 100 * 1024 * 1024, // storage size in bytes, default 20MB // 0: unlimited?
		concurrency: 3, // how many concurrent uploads/downloads?
	});
	const localState = {
		templates: {},
		documents: {},
		documents_last: {},
		preferences: {
			//DEFAULT PREFS
			debug: true,
			reset: false,
			minimizeDataUse: false,
			pingTimeout: 600,
			_description: {
				debug: "Enable Network debugging",
				reset: "Clear Saved Settings on next start",
				minimizeDataUse: "Minimize data use.",
				pingTimeout: "API Check Interval",
			},
		},
		user: false,
		provisioning: false,
		lastPingTime: 0,
		connected: false,
		networkLogging: false,
		myToken: 0,
		pingTimeout: 5, //Seconds
	};

	async function clearStorage() {
		console.log(await fs.removeDir("/"));
	}

	async function pingServer() {
		if (!localState.user) {
			console.log("No User, Ping aborted.");
			localState.connected = false;
			return false;
		}

		let thisRequestTime = parseInt(Date.now() / 1000);
		let pingTargetTime =
			(localState.lastPingTime || 0) + localState.preferences.pingTimeout;

		if (pingTargetTime - thisRequestTime < 0) {
			console.log("Clearing Ping Worker");
			clearTimeout(_pingWorker);

			return fetch(APIServerDefault + "/ping", {
				method: "post",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					u: localState.user ? localState.user.username : "",
				}),
			})
				.then((response) => {
					if (response.status == 202) {
						localState.lastPingTime = thisRequestTime;
						localState.connected = true;

						let nextPing = (localState.preferences.pingTimeout + 5) * 1000;
						console.log("ping again in:", nextPing);
						_pingWorker = setTimeout(pingServer.bind(), nextPing); //timeout + 5sec to allow expire

						return "202 OK";
					} else {
						alert("ping returned: " + response.status);
						localState.connected = false;
						return false;
					}
				})
				.catch((err) => {
					alert("ping error: " + err);
					localState.connected = false;
					return false;
				});
		}
	}

	async function connectionStateChange() {
		switch (navigator.connection.type) {
			case Connection.WIFI:
			case Connection.ETHERNET: {
				ons.notification.toast("DIRECT CONN", { timeout: 5000 });
				console.log(await pingServer());
				break;
			}
			case Connection.CELL:
			case Connection.CELL_4G:
			case Connection.CELL_3G:
			case Connection.CELL_2G: {
				if (localState.preferences.minimizeDataUse) {
					ons.notification.toast("MOBILE DATA - MIN", { timeout: 5000 });
					localState.connected = false;
				} else {
					console.log(await pingServer());
					ons.notification.toast("MOBILE DATA", { timeout: 5000 });
				}
				break;
			}
			case Connection.UNKNOWN:
			default: {
				localState.connected = false;
				ons.notification.toast("DISCONNECTED", { timeout: 5000 });
			}
		}
	}

	function pushMessageHandler(message) {
		console.debug("pushMessageHandler::", message);
		ons.notification.toast(JSON.stringify(message), { timeout: 2000 });
	}

	async function init() {
		console.log("Loading User Profile.");
		if (await fs.exists("userProfile")) {
			cachedUser = await fs.readJSON("userProfile");
			localState.user = cachedUser;
			log("Loaded Cached User " + cachedUser.username);
		} else {
			console.log("No Cached User");
			localState.user = false;
		}
		await connectionStateChange(); //doesn't fire onDeviceReady iOS
		//Load Saved Prefs, Or Write Defaults
		console.log("Loading Preferences: ");
		console.log(await this.preferences); //Getter Does File Load

		console.log("Loading Provisioning.");
		if (localState.user) {
			if (!(await this.provisioning)) {
				app.fatalError(
					"No Provisioning",
					`The provisioning server was unreachable, 
				  check your connection and try again.`
				);
				return;
			}
		} else {
			console.log("No User, Skipping Provisioning");
		}

		await FCM.requestPushPermission({
			ios9Support: {
				timeout: 10, // How long it will wait for a decision from the user before returning `false`
				interval: 0.3, // How long between each permission verification
			},
		});

		if (FCM.hasPermission()) {
			let token = await FCM.getToken();
			localState.myToken = token;

			const disposable = FCM.onNotification(pushMessageHandler);
		}

		console.debug("Binding ConnectionState Handlers");

		document.addEventListener("offline", connectionStateChange, false);
		document.addEventListener("online", connectionStateChange, false);

		console.log("Sync Templates.");
		console.log(await this.templates);

		console.log("Sync Documents.");

		if (await fs.exists("documents")) {
			cachedDocs = await fs.readJSON("documents");
			//Validate Cached User Here.
			try {
				JSON.parse(cachedDocs);
				localState.documents = cachedDocs;
			} catch {
				localState.documents = {};
			}
		}
	}

	function doFirstRun() {
		alert("In Firstrun");
	}

	function log(logitem, module = "") {
		if (localState.networkLogging && localState.connected) {
		} else {
		}
		console.log(JSON.stringify(logitem));
	}
	function doLogin(username, password) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(false);
			}, 5000);

			fetch(`${APIServerDefault}/user/login`, {
				method: "post",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username: username,
					passhash: password.length ? hex_sha1(password) : "",
				}),
			})
				.then((r) => {
					if (r.status == 202) {
						doFirstRun();
						return;
					} else if (r.status == 200) {
						return r;
					} else {
						resolve(false);
						return;
					}
				})
				.then((r) => r.json())
				.then((data) => {
					//populate our passhash, as server doesn't send it.
					data.passhash = hex_sha1(password);
					data.auth = JSON.parse(data.auth);
					data.reserved = JSON.parse(data.reserved);

					fs.write("userProfile", data)
						.then(console.debug("Saved User"))
						.catch((e) => console.warn("Error Fetching User"));

					localState.user = data;

					pingServer();

					resolve(true);
				})
				.catch((e) => resolve(false));
		});
	}

	function doLogout() {
		fs.remove("userProfile").then((e) => {
			fs.remove("provisioning");
			console.debug(e);

			location.reload();
		});
	}

	function listResource(resource, options = {}) {
		return new Promise(function (resolve, reject) {
			console.log("LISTRESOURCE: ", resource);

			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);

			if (SiteSafeAPI.isConnected) {
				fetch(`${APIServerDefault}/list/${resource}`, {
					method: "post",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						user: localState.user,
					}),
				})
					.then((list) => {
						console.log(list);
						resolve(list);
					})
					.catch((e) => reject(e));
			} else {
				reject();
			}
		});
	}

	function listUsers(options = {}) {
		return new Promise(function (resolve, reject) {
			console.log("LISTUSERS: ");

			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);

			if (SiteSafeAPI.isConnected) {
				fetch(`${APIServerDefault}/user/list`, {
					method: "post",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						user: localState.user,
					}),
				})
					.then((r) => r.json())
					.then((list) => {
						console.log(list);
						resolve(list);
					})
					.catch((e) => reject(e));
			} else {
				reject();
			}
		});
	}

	function putDocument(doc) {
		return new Promise(function (resolve, reject) {
			setTimeout(() => {
				reject({ status: 500, message: "Timed Out." });
			}, 5000);

			if (SiteSafeAPI.isConnected) {
				fetch(`${APIServerDefault}/put/document`, {
					method: "post",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						user: localState.user,
						document: doc,
						provisioning: localState.provisioning,
					}),
				})
					.then((e) => {
						localState.documents[doc.id] = undefined; //update?
						resolve(e);
					})
					.catch((e) => reject(e));
			} else {
				alert("Not Connected");
			}
		});
	}
	function fetchResource(resource, options = {}) {
		return new Promise(function (resolve, reject) {
			reject();
		});
	}
	function getFillableControlFromJSON(obj_JSON) {
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
					SiteSafeAPI.getFillableControlFromJSON(subelement)
				);
			});

			thisElement.appendChild(subControlElement);
		};

		let thisElement = ons.createElement(
			`<div class="printable controlItem"></div>`
		);

		switch (obj_JSON.type) {
			// LABEL
			case 0: {
				thisElement.appendChild(
					ons.createElement(
						`<div class="itemHeader">
						<span class="itemTitle">${obj_JSON.text ? obj_JSON.text : ""}</span>
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
						<span class="itemTitle">${obj_JSON.text ? obj_JSON.text : ""}</span>
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
				thisElement.appendChild(
					ons.createElement(`
				<div class="formItem_checkbox">
				<ons-checkbox input-id="fResp_${obj_JSON.id}"></ons-checkbox> 
				<label for="fResp_${obj_JSON.id}">
					${obj_JSON.text}
				</label>
				</div>`)
				);
				break;
			}
			//Text Input
			case 3: {
				thisElement.appendChild(
					ons.createElement(`<div class="itemHeader">${obj_JSON.text}</div>`)
				);
				thisElement.appendChild(
					ons.createElement(`	
					<ons-input style="width: 100%;border: 1px dotted #CCCCCC; 
							border-radius: .2em; 
							background-color: #EEEEEE;" 
				id="o_${obj_JSON.id}" 
				input-id="fResp_${obj_JSON.id}" 
				float>
			</ons-input>`)
				);
				break;
			}
			//Multiline Text
			case 4: {
				thisElement.appendChild(
					ons.createElement(`<div class="itemHeader">${obj_JSON.text}</div>`)
				);
				thisElement.appendChild(
					ons.createElement(`<textarea id="fResp_${obj_JSON.id}" 
				style="resize: none; 
						 height: ${obj_JSON.size ? obj_JSON.size : 70}vh;
						width: 90vw; 
				border-radius: .25em"></textarea>
				`)
				);
				break;
			}
			case 5: {
				thisElement.appendChild(
					ons.createElement(`<img src="${obj_JSON.src}">`)
				);
				break;
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
					e.target.setAttribute("data", JSON.stringify(this.toData()));
				};

				let controls = ons.createElement(`<div class="controls">
					</div>`);
				let addSig = ons.createElement(`<ons-button icon="plus"></ons-button>`);
				let removeSig = ons.createElement(
					`<ons-button icon="trash"></ons-button>`
				);
				addSig.addEventListener("click", function (e) {
					signaturePad.off();

					newSig = sixWestPromiseAPI.getFillableControlFromJSON({
						id: `signature_${
							document.querySelectorAll(".signatureBox").length
						}`,
						type: 6,
					});
					thisElement.appendChild(newSig);
					addSig.remove();
				});

				removeSig.addEventListener("click", function () {
					thisElement.remove();
				});
				controls.appendChild(addSig);
				controls.appendChild(removeSig);
				thisElement.appendChild(controls);
				thisElement.appendChild(s);
				break;
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
	}
	return {
		get preferences() {
			return (async () => {
				e = await fs.exists("preferences");
				if (e.isFile) {
					try {
						data = await fs.readJSON(e.fullPath);
					} catch {
						throw "Read Failed";
					}

					localState.preferences = data;
					return data;
				} else {
					if (localState.preferences) {
						console.log("Default Prefs");
						return localState.preferences;
					} else {
						console.log("No Prefs!!");
						return false;
					}
				}
			})();
		},
		set preferences(newprefs) {
			console.log("saved Prefs");
			localState.preferences = newprefs;
			fs.write("preferences", newprefs);
		},
		get provisioning() {
			return (async () => {
				if (localState.provisioning) {
					console.log("Default Prov");
					return localState.preferences;
				} else {
					e = await fs.exists("provisioning");
					if (e.isFile) {
						console.log("fs prov");
						try {
							data = await fs.readJSON(e.fullPath);
						} catch {
							throw "fs Provisioning Broken";
						}

						localState.provisioning = data;
						return data;
					} else {
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								resolve(false);
							}, 5000);

							if (SiteSafeAPI.isConnected) {
								fetch(`${APIServerDefault}/user/provision`, {
									method: "post",
									headers: {
										"Content-Type": "application/json",
									},
									body: JSON.stringify({
										user: localState.user,
									}),
								})
									.then((p) => {
										if (p.status != 200) {
											reject();
											return;
										} else {
											p.json()
												.then((provisioning) => {
													localState.provisioning = provisioning;

													fs.write("provisioning", provisioning)
														.then((res) => {
															console.log("PROVISION OK:", provisioning);
															resolve(provisioning);
														})
														.catch((e) => {
															console.log("PROVISION FAILED:", provisioning);
															resolve(false);
														});
												})
												.catch((e) => {
													console.log("PARSE ERROR IN PROVISIONING");
												});
										}
									})
									.catch((e) => {
										reject("FETCH ERROR IN Provisioning");
									});
							} else {
								console.log("NOCONN");
							}
						});
					}
				}
			})();
		},
		getFillableControlFromJSON,
		doLogin,
		doLogout,
		clearStorage,
		listResource,
		fetchResource,
		putDocument,
		listUsers,
		init,
		log,
		localState,
		fs,
		get isLoggedIn() {
			return localState.user ? true : false;
		},
		get user() {
			return localState.user;
		},
		get templates() {
			return (async () => {
				if (localState.connected) {
					return new Promise((resolve, reject) => {
						fetch(APIServerDefault + "/list/templates", {
							method: "post",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								user: localState.user,
								provisioning: localState.provisioning,
							}),
						})
							.then((resp) => resp.json())
							.then((templateList) => {
								templateList.forEach((i) => {
									i.data = JSON.parse(i.data);
									i.meta = JSON.parse(i.meta);

									localState.templates[i.id] = i;
								});
								fs.write("templates", localState.templates);
								resolve(localState.templates);
							})
							.catch((e) => reject(e));
					});
				} else {
					e = await fs.exists("templates");
					if (e.isFile) {
						try {
							data = await fs.readJSON(e.fullPath);
						} catch {
							throw "Read Failed";
						}

						localState.templates = data;
						return data;
					} else {
						console.error("No Templates Loaded");
						return [];
					}
				}
			})();
		},
		get documents() {
			return localState.documents;
		},
		get changed_documents() {
			return (async () => {
				//	prov = await SiteSafeAPI.provisioning;

				if (localState.connected) {
					return new Promise((resolve, reject) => {
						fetch(APIServerDefault + "/list/documents", {
							method: "post",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								u: localState.user,
								p: localState.provisioning,
							}),
						})
							.then((resp) => resp.json())
							.then((listDocs) => {
								//obj, so deep copy
								localState.docs_last = UTIL.cloneObject(localState.documents);
								//localState.documents = listDocs;

								listDocs.forEach((i) => {
									//i.data = JSON.parse(i.data);
									//i.meta = JSON.parse(i.meta);

									localState.documents[i.id] = i;
								});

								fs.write("documents", localState.documents);

								let addedDocuments = UTIL.getNewObjectKeys(
									localState.documents,
									localState.docs_last
								);

								let removedDocuments = UTIL.getNewObjectKeys(
									localState.docs_last,
									localState.documents
								);

								resolve({ added: addedDocuments, removed: removedDocuments });
							})
							.catch((e) => reject(e));
					});
				} else {
					e = await fs.exists("documents");
					if (e.isFile) {
						try {
							data = await fs.readJSON(e.fullPath);
						} catch {
							throw "Read Failed";
						}

						localState.documents = data;

						let addedDocuments = UTIL.getNewObjectKeys(
							localState.documents,
							localState.documents_last
						);
						let removedDocuments = UTIL.getNewObjectKeys(
							localState.documents_last,
							localState.documents
						);

						return { added: addedDocuments, removed: removedDocuments };
					} else {
						console.error("No Templates Loaded");
						return { added: {}, removed: {} };
					}
				}
			})();
		},
		get isConnected() {
			return localState.connected;
		},
		get myToken() {
			return localState.myToken;
		},
	};
};
