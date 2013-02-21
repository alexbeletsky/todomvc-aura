define(['underscore'], function (_) {

    return {
        template: 
            '<footer id="footer">\
                <span id="todo-count"><strong><%= total %></strong> item left</span>\
                <button id="clear-completed">Clear completed (1)</button>\
            </footer>',

        initialize: function () {
            _.bindAll(this);

            this.currentTasks = 0;

            this.render();
            this.attachEvents();
        },

        render: function () {
            if (this.currentTasks > 0) {
                this.$el.html(_.template(this.template, { total: this.currentTasks }));
            }
        },

        attachEvents: function () {
            this.sandbox.on('tasks/createNewTask', this.createNewTask);
        },

        createNewTask: function () {
            this.currentTasks++;
            this.render();
        }
    };

});