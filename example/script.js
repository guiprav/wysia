window.get_cookies = function()
{
	if(document.cookie === '')
	{
		return {
			tasks: []
		};
	}
	return JSON.parse(unescape(document.cookie));
};
window.set_cookies = function(data)
{
	document.cookie = escape(JSON.stringify(data));
}
$('form[action-name="add-task"]').on
(
	'submit', function(event)
	{
		var $this = $(this);
		var task_input = $this.find('input[name="task"]');
		var new_task = task_input.val();
		var cookies = get_cookies();
		cookies.tasks.push(new_task);
		set_cookies(cookies);
	}
);
$('form[action-name="clear-task"]').on
(
	'submit', function()
	{
		var $this = $(this);
		var task_id = $this.find('input[name="task-id"]').val();
		var cookies = get_cookies();
		cookies.tasks.splice(task_id, 1);
		set_cookies(cookies);
	}
);
