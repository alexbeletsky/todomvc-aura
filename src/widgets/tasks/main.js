define(['jquery', 'underscore'], function ($, _) {

    return {
        template: 
            '<section id="main">\
                <input id="toggle-all" type="checkbox">\
                <label for="toggle-all">Mark all as complete</label>\
                <ul id="todo-list"></ul>\
            </section>',

        taskTemplate: 
            '<li id=<%= id%>>\
                <div class="view">\
                    <input class="toggle" type="checkbox">\
                    <label><%= description %></label>\
                    <button class="destroy"></button>\
                </div>\
                <input class="edit" value="<%= description %>">\
            </li>',

        initialize: function () {
            _.bindAll(this);

            this.render();
            this.cacheElements();
            this.attachEvents();

            this.sandbox.on('storage/newTaskCreated', this.newTaskCreated);
        },

        render: function () {
            this.$el.html(this.template);
        },

        cacheElements: function () {
            this.$todoList = this.$el.find('#todo-list');
        },

        attachEvents: function () {
            this.$todoList.on('click', '.toggle', this.toggleTask);
            this.$todoList.on('click', '.destroy', this.deleteTask);
        },

        newTaskCreated: function(task) {
            var taskHtml = _.template(this.taskTemplate, task);
            this.$todoList.append(taskHtml);
        },

        toggleTask: function (e) {
            var $task = $(e.target).closest('li');
            $task.toggleClass('completed');

            this.sandbox.emit('ui/toggleTask', {id: $task.attr('id')});
        },

        deleteTask: function (e) {
            var $task = $(e.target).closest('li');
            $task.remove();

            this.sandbox.emit('ui/deleteTask', {id: $task.attr('id')});
        }
    };

});