import { Project } from '../models/project.js';
import { Profile } from '../models/profile.js';

const index = (req, res) => {
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
      res.render('projects/index', {
        title: 'projects',
        projects: onlyVisible,
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

const newProject = (req, res) => {
  console.log(req.user.profile._id);
  console.log(req.user.profile.name)
  console.log('creting new project')
  Profile.findById(req.user.profile._id)
    .then((self) => {
      const role = self.role;
      const owner = self._id;
      const isSelf = self._id.equals(req.user.profile._id);
      const ownerName = self.name;
      const ownerAvatar = self.avatar;
      console.log(self);
      res.render('projects/new', {
        title: 'New Project',
        self,
        isSelf,
        role,
        owner,
        ownerName,
        ownerAvatar,
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

const create = (req, res) => {
  req.body.visible = !!req.body.visible;
  Project.create(req.body)
    .then(() => {
      res.redirect('/projects');
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

const show = (req, res) => {
  Project.findById(req.params.id)
    .populate('comments')
    .exec()
    .then((project) => {
      const ownerName = project.ownerName;
      const ownerAvatar = project.ownerAvatar;
      let total = 0;
      project.rating.forEach((rate) => {
        total += rate;
      });
      let averageRating = total / project.rating.length;
      Profile.findById(req.user.profile._id).then((self) => {
        const isSelf = self._id.equals(req.user.profile._id);
        const name = self.name;
        const avatar = self.avatar;
        res.render('projects/show', {
          ownerName,
          ownerAvatar,
          averageRating,
          Project,
          self,
          isSelf,
          avatar,
          name,
          title: 'Project Details',
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

const edit = (req, res) => {
  Project.findById(req.params.id)
    .then((Project) => {
      Profile.findById(req.user.profile._id).then((self) => {
        const role = self.role;
        const owner = self._id;
        const isSelf = self._id.equals(req.user.profile._id);
        const ownerName = self.name;
        const ownerAvatar = self.avatar;
        res.render('projects/edit', {
          self,
          isSelf,
          owner,
          ownerName,
          ownerAvatar,
          role,
          title: 'Edit Project',
          Project,
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

const update = (req, res) => {
  Project.findById(req.params.id)
    .then((project) => {
      if (project.owner.equals(req.user.profile._id)) {
        req.body.visible = !!req.body.visible;
        project.updateOne(req.body, { new: true }).then(() => {
          res.redirect(`/projects/${project._id}`);
        });
      } else {
        throw new Error(
          '🚫 You are absolutely NOT authorised to even try that!!! 🚫'
        );
      }
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

const deleteProject = (req, res) => {
  Project.findById(req.params.id)
    .then((project) => {
      if (project.owner.equals(req.user.profile._id)) {
        project.delete().then(() => {
          res.redirect('/projects');
        });
      } else {
        throw new Error(
          '🚫 You are absolutely NOT authorised to even try that!!! 🚫'
        );
      }
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

const addComment = (req, res) => {
  const ProjectRating = req.body.rating;
  req.body.owner = req.user.profile._id;
  Project.findById(req.params.id)
    .then((project) => {
      project.rating.push(ProjectRating);
      project.comments.push(req.body);
      project.save().then(() => {
        res.redirect(`/projects/${project._id}`);
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect(`/projects/${project._id}`);
    });
};

const deleteComment = (req, res) => {
  Project.findById(req.params.id)
    .then((project) => {
      project.comments.remove({ _id: req.params.commentId });
      project.save().then(() => {
        res.redirect(`/projects/${req.params.id}`);
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect(`/projects/${req.params.id}`);
    });
};

export {
  index,
  newProject as new,
  create,
  show,
  edit,
  update,
  deleteProject as delete,
  addComment,
  deleteComment,
};
