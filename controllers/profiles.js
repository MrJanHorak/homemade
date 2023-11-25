import { Profile } from '../models/profile.js';
import { Project } from '../models/project.js';

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
          categories
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/profiles');
    });
}

const update = (req, res) => {
  Profile.findById(req.params.id)
    .then((profile) => {
      profile.name = req.body.name;
      profile.avatar = req.body.avatar;
      profile.description = req.body.description;
      profile.location = req.body.location;
      profile.website = req.body.website;
      profile.social.facebook = req.body.facebook;
      profile.social.twitter = req.body.twitter;
      profile.social.linkedin = req.body.linkedin;
      profile.social.instagram = req.body.instagram;
      profile.social.youtube = req.body.youtube;
      profile.social.snapchat = req.body.snapchat;
      profile.social.pinterest = req.body.pinterest;
      profile.social.reddit = req.body.reddit;
      profile.social.tiktok = req.body.tiktok;
      profile.social.twitch = req.body.twitch;
      profile.social.discord = req.body.discord;
      profile.social.github = req.body.github;
      profile.social.other = req.body.other;
      profile.skills = req.body.skills;
      profile.save();
      res.redirect(`/profiles/${profile._id}`);
    })
    .catch((err) => {
      console.log(err);
      res.redirect('/profiles');
    });
}


export { index, show, edit, update };
