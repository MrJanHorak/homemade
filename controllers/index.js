import { Project } from '../models/project.js';

function index(req, res) {
  Project.find({})
    .sort({ createdAt: 'descending' })
    .then((projects) => {
      res.render('index', {
        title: 'Homemade',
        projects,
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/');
    });
}

export { index };
