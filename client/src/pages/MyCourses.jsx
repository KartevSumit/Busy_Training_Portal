import { useAuth } from '../contexts/AuthContext';
import MyCoursesInstructor from './MyCoursesInstructor';
import MyCoursesLearner from './MyCoursesLearner';

export default function MyCourses() {
  const { user } = useAuth();

  if (user?.role === 'INSTRUCTOR') {
    return <MyCoursesInstructor />;
  }

  return <MyCoursesLearner />;
}
