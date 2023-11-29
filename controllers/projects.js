import { Project } from '../models/project.js';
import { Profile } from '../models/profile.js';
import { projectPicstoS3 } from '../services/s3.js';
import categories from '../data/categories.js';
import multer from 'multer';
import aws from 'aws-sdk';

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
  Profile.findById(req.user.profile._id)
    .then((self) => {
      const role = self.role;
      const owner = self._id;
      const isSelf = self._id.equals(req.user.profile._id);
      const ownerName = self.name;
      const ownerAvatar = self.avatar;

      res.render('projects/new', {
        title: 'New Project',
        self,
        isSelf,
        role,
        owner,
        ownerName,
        ownerAvatar,
        categories,
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

const create = async (req, res) => {

  console.log(req.files)
  try {
    req.body.visible = !!req.body.visible;

    const storage = multer.memoryStorage();
    const upload = multer({ storage }).array('projectPics', 12);

    if (
      req.files &&
      req.files.length > 0
    ) {
      const projectPicsUrls = await projectPicstoS3(req.files);
      req.body.projectPictures = projectPicsUrls;
    }

    await Project.create(req.body);

    res.redirect('/projects');
  } catch (err) {
    console.log(err);
    res.redirect('/projects');
  }
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

      let averageRating = total / project.rating.length || 0;

      if (req.isAuthenticated()) {
        Profile.findById(req.user.profile._id).then((self) => {
          const isSelf = self._id.equals(req.user.profile._id);
          const name = self.name;
          const avatar = self.avatar;
          res.render('projects/show', {
            ownerName,
            ownerAvatar,
            averageRating,
            project,
            self,
            isSelf,
            avatar,
            name,
            title: 'Project Details',
          });
        });
      } else {
        res.render('projects/show', {
          ownerName,
          ownerAvatar,
          averageRating,
          project,
          name: 'Anonymous',
          avatar: 'https://imgur.com/AtjZFtn',
          title: 'Project Details',
          isSelf: false,
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/projects');
    });
};

const edit = (req, res) => {
  Project.findById(req.params.id)
    .then((project) => {
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
          project,
          categories,
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
        project.deleteOne().then(() => {
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
