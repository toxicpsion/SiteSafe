let modal = {
	isVisible: function () {
		let m = document.querySelector("ons-modal");
		return m.visible;
	},
	show: function (message) {
		if (modal.isVisible()) {
			console.debug(
				"Modal Already Visible. Setting it's message text instead.",
				message
			);
			modal.setText(message);
			return;
		}

		let m = document.querySelector(".lModalMessage");

		m.innerHTML = `<ons-icon icon="md-spinner" size="10vh" spin></ons-icon>
			<p>${message}</p>`;

		document.querySelector("ons-modal").show();
	},
	hide: function () {
		document.querySelector("ons-modal").hide();
	},
	setText: function (message) {
		let m = document.querySelector(".lModalMessage");
		m.visible = false;
		m.innerHTML = `<ons-icon icon="md-spinner" size="10vh" spin></ons-icon>
			<p>${message}</p>`;
		m.visible = true;
	},
};