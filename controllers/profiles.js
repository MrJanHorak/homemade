import { Profile } from '../models/profile.js';
import { Project } from '../models/project.js';
import { profilePicstoS3 } from '../jsServices/s3Service.js';

import categories from '../data/categories.js';

const index = (req, res) => {
  Profile.find({})
    .then((profiles) => {
      Project.find({}).then((projects) => {
        res.render('profiles/index', {
          title: 'Profiles',
          profiles,
          projects,
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/profiles');
    });
};

const show = (req, res) => {
  Profile.findById(req.params.id)
    .then((profile) => {
      Project.find({ owner: req.params.id })
        .sort({ name: 'asc' })
        .then((projects) => {
          Profile.findById(req.user.profile._id).then((self) => {
            const isSelf = self._id.equals(profile._id);
            const role = self.role;
            res.render('profiles/show', {
              title: `${profile.name}'s profile`,
              profile,
              self,
              isSelf,
              role,
              projects,
            });
          });
        });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/');
    });
};

const edit = (req, res) => {
  Profile.findById(req.params.id)
    .then((profile) => {
      Profile.findById(req.user.profile._id).then((self) => {
        const role = self.role;
        const isSelf = self._id.equals(profile._id);
        res.render('profiles/edit', {
          self,
          isSelf,
          role,
          title: 'Edit Profile',
          profile,
          categories,
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/profiles');
    });
};

const update = (req, res) => {
  console.log(req.body);
  if (req.file) {
    profilePicstoS3(req.file)
      .then((url) => {
        req.body.avatar = url;
      })
      .catch((err) => {
        console.log(err);
        res.redirect('/profiles');
      });
  }

  Profile.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then((profile) => {
      res.redirect(`/profiles/${profile._id}`);
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/profiles');
    });
};

export { index, show, edit, update };
