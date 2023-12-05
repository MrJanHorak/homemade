import { Project } from '../models/project.js';

const searchProjects = async (req, res) => {
  const { query } = req.query;

  try {
    const results = await Project.find({
      $or: [
        { title: { $regex: query, $options: 'i' } }, // Case-insensitive title search
        { description: { $regex: query, $options: 'i' } }, // Case-insensitive description search
      ],
    });

    res.render('search/searchResults', { title: 'search results', results, query });
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).send('Internal Server Error');
  }
};

export { searchProjects };