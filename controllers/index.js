import { Project } from '../models/project.js';

const index = (req, res) => {
  console.log('index');
  Project.find({})
    .sort({ name: 'asc' })
    .then((projects) => {
      // filter out projects that are not visible
      const onlyVisible = projects.filter((project) => {
        return project.visible;
      });
      // calculate the number of likes for each project and add it to the project object
      onlyVisible.forEach((project) => {
        project.likes = project.likes.length;
      });
      // calculate the average rating for each project and add it to the project object
      onlyVisible.forEach((project) => {
        let total = 0;
        project.rating.forEach((rate) => {
          total += rate;
        });
        let averageRating = total / project.rating.length;
        project.averageRating = averageRating;
      });
      res.render('index', {
        title: 'projects',
        projects: onlyVisible,
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

export { index };
