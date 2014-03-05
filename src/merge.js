function merge(left, right) {
	var left_type = merge_data_type(left);
	var right_type = merge_data_type(right);
	var combination = left_type + '<-' + right_type;
	var fn_tab = {
		'data<-data': replace_data
		, 'data<-object': replace_data
		, 'data<-array': replace_data
		, 'object<-object': merge_objects
		, 'array<-array': merge_arrays
		, 'object<-array': replace_data
		, 'array<-object': replace_data
	};
	return fn_tab[combination](left, right);
}
function merge_data_type(value) {
	if(!value && value !== false) {
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
}
function merge_objects(left, right) {
	var mix = {};
	for(var key in left) {
		mix[key] = left[key];
	}
	for(var key in right) {
		mix[key] = merge(mix[key], right[key]);
	}
	return mix;
}
function merge_arrays(left, right) {
	return [].concat(left, right);
}
function replace_data(left, right) {
	return right;
}
module.exports = merge;
