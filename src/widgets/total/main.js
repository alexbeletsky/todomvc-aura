define(['underscore'], function (_) {

    return {
        template: 
            '<footer id="footer">\
                <span id="todo-count"><strong><%= total %></strong> item left</span>\
                <button id="clear-completed" display="none">Clear completed (<%= completed %>)</button>\
            </footer>',

        initialize: function () {
            _.bindAll(this);

            this.currentTasks = 0;
            this.completedTasks = 0;

            this.render();
            this.attachEvents();

            this.sandbox.on('storage/newTaskCreated', this.createNewTask);
            this.sandbox.on('storage/taskToggled', this.taskToggled);
            this.sandbox.on('storage/taskDeleted', this.taskDeleted);
        },

        render: function () {
            if (this.currentTasks > 0) {
                this.$el.html(_.template(this.template, { total: this.currentTasks, completed: this.completedTasks }));
            }

            if (this.completedTasks > 0) {
                this.$el.find('#clear-completed').show();
            } else {
                this.$el.find('#clear-completed').hide();
            }
        },

        attachEvents: function () {
        },

        createNewTask: function () {
            this.currentTasks++;
            this.render();
        },

        taskToggled: function(task) {
            task.completed ? this.completedTasks++ : this.completedTasks--;
            this.render();
        },

        taskDeleted: function () {
            this.currentTasks--;
            this.render();
        }
    };

});