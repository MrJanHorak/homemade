import { Profile } from '../models/profile.js';
import { Project } from '../models/project.js';

function index(req, res) {
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
}

function show(req, res) {
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
}

export { index, show };
