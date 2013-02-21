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
            this.$todoList.on('dblclick', 'label', this.edit);
            this.$todoList.on('keyup', '.edit', this.updateTask);
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
        },

        edit: function (e) {
            $(e.target).closest('li').addClass('editing').find('.edit').focus();
        },

        updateTask: function (e) {
            if (e.which === 13) {
                var value = $(e.target).val();
                var $task = $(e.target).closest('li');
                $task.removeClass('editing');
                $task.find('label').text(value);

                this.sandbox.emit('ui/editTask', { id: $task.attr('id'), description: value});
            }
        }
    };

});