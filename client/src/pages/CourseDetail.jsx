import { useAuth } from '../contexts/AuthContext';
import CourseDetailInstructor from './CourseDetailInstructor';
import CourseDetailLearner from './CourseDetailLearner';

export default function CourseDetail() {
  const { user } = useAuth();

  if (user?.role === 'INSTRUCTOR') {
    return <CourseDetailInstructor />;
  }

  return <CourseDetailLearner />;
}
