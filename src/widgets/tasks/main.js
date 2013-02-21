define(['underscore'], function (_) {

    return {
        template: 
            '<section id="main">\
                <input id="toggle-all" type="checkbox">\
                <label for="toggle-all">Mark all as complete</label>\
                <ul id="todo-list"></ul>\
            </section>',

        taskTemplate: 
            '<li>\
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
        },

        render: function () {
            this.$el.html(this.template);
        },

        cacheElements: function () {
            this.$todoList = this.$el.find('#todo-list');
            this.$toggleAll = this.$el.find('#toggle-all');
        },

        attachEvents: function () {
            this.sandbox.on('tasks/createNewTask', this.createNewTask);
        },

        createNewTask: function(task) {
            var taskHtml = _.template(this.taskTemplate, task);
            this.$todoList.append(taskHtml);
        }
    };

});