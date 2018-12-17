import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import chalk from 'chalk';
import { startOfTomorrow, isPast } from 'date-fns';

mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true });

const db = mongoose.connection;

db.on('error', console.error.bind(console, chalk.redBright('Connection error')));
db.on('open', () => console.log(chalk.yellow('Connected to database.')));

const todoListSchema = new mongoose.Schema({
  todoList: {},
});

const TodoList = mongoose.model('TodoList', todoListSchema);

const app = express();

app.use(bodyParser.json());

app.listen(3000, () => console.log(chalk.underline('Server is up and running on port 3000 🚀')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type')
  next();
})

app.post('/api/save', (req, res) => {
  const todoList = processData(req.body);

  TodoList.deleteOne()
    .then(() => new TodoList({ todoList }).save())
    .then(() => res.sendStatus(200))
});

const processData = (data) => {
  const { tabs } = data;

  Object.keys(tabs).map((key) => {
    const tabData = tabs[key];

    if (tabData.daily) {
      tabs[key] = {...tabData, timestamp: startOfTomorrow().setHours(3)};
    }
  })

  return data;
}

app.get('/api/init', (req, res) => {
  TodoList.findOne(null, (err, data) => {
    if (err) return;
    if (data) {
      const { todoList } = data;
      return res.send(handleDailyRefresh(todoList));
    }
    return res.sendStatus(204);
  });
});

const handleDailyRefresh = (data) => { // TODO: try to optimize, strip timestamps from response
  const { tabs, tasks } = data;

  Object.keys(tabs).map((key) => {
    const { timestamp, taskIds } = tabs[key];

    if (timestamp && isPast(timestamp)) {
      taskIds.map((id) => {
        tasks[id].done = false;
      })
    }
  })

  return data;
}