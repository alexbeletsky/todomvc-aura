define(['underscore'], function (_) {
    var app;
    var todos = [];

    function createNewTask(data) {
        var task = _.extend(data, {id: _.uniqueId('task')});
        todos.push(task);

        app.sandbox.emit('storage/newTaskCreated', task);
    }

    function toggleTask(data) {
        var task = _.find(todos, function(task) {
            return task.id === data.id;
        })
        var completed = task.completed || false;
        task.completed = !completed;

        app.sandbox.emit('storage/taskToggled', task);
    }

    function deleteTask(data) {
        todos = _.reject(todos, function (task) {
            return task.id === data.id;
        });

        app.sandbox.emit('storage/taskDeleted');
    }

    return {
        initialize: function (application) {
            app = application;
            app.sandbox.on('ui/createNewTask', createNewTask);
            app.sandbox.on('ui/toggleTask', toggleTask);
            app.sandbox.on('ui/deleteTask', deleteTask);
        }
    };

});