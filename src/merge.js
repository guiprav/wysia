function merge(a, b) {
	return merge.with[merge.data_type(b)](a, b);
}
merge.data_type = function(value) {
	if(value === undefined) {
		return 'undefined';
	}
	if(value === null) {
		return 'data';
	}
	switch(value.constructor) {
		case Object:
			return 'object';
		case Array:
			return 'array';
		default:
			return 'data';
	}
};
merge.with = {};
merge.with.object = function(a, b) {
	if (merge.data_type(a) === 'object') {
		return merge.with.object.recurse(a, b);
	}
	else {
		return b;
	}
};
merge.with.object.recurse = function(a, b) {
	Object.keys(b).forEach (
		function(key) {
			a[key] = merge(a[key], b[key]);
		}
	);
	return a;
};
merge.with.array = function(a, b) {
	if(merge.data_type(a) === 'array') {
		return a.concat(b);
	}
	else {
		return b;
	}
};
merge.with.data = function(a, b) {
	return b;
};
module.exports = merge;
