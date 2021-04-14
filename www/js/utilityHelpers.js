let UTIL = {
	getNewObjectKeys: function getNewObjectKeys(newObject, oldObject) {
		if (!(newObject instanceof Object) || !(oldObject instanceof Object))
			return;

		let diff = Object.keys(newObject).filter(
			(x) => !Object.keys(oldObject).includes(x)
		);
		let difference = {};
		diff.forEach((i) => (difference[i] = newObject[i]));
		return difference;
	},
	isEmptyObject: function (obj) {
		var name;
		for (name in obj) {
			Object.prototype.hasOwnProperty.call(obj, name);
			//if (obj.hasOwnProperty(name)) {
			if (Object.prototype.hasOwnProperty.call(obj, name)) {
				return false;
			}
		}
		return true;
	},
};
