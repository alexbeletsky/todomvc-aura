define(['underscore'], function (_) {

    return {
        template: 
            '<header id="header">\
                <h1>todos</h1>\
                <input id="new-todo" placeholder="What needs to be done?" autofocus>\
            </header>',

        initialize: function () {
            _.bindAll(this);

            this.$el.html(this.template);
            this.$newTodo = this.$el.find('#new-todo');
            this.$el.find('#new-todo').on('keyup', this.createNewTask);
        },

        createNewTask: function(e) {
            if (e.which === 13) {
                var val = this.$newTodo.val();
                this.sandbox.emit('tasks/createNewTask', {description: val});
                this.$newTodo.val('');
            }
        }
    };

});