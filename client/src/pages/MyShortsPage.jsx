import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import DeleteConfirmModal from '../components/shorts/DeleteConfirmModal';
import { supabase } from '../supabase/client';
import { toast } from 'react-toastify';
import MyShortsList from '../components/shorts/MyShortsList';

const MyShortsPage = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [shorts, setShorts] = useState([]);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showOptions, setShowOptions] = useState(null);
  const optionsRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchShorts = async () => {
      if (!user) {
        setShorts([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('shorts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching shorts:', error);
          toast.error('Failed to load your shorts');
          return;
        }

        // Group shorts by original_video_path
        const groupedShorts = data.reduce((acc, short) => {
          const key = short.original_video_path;
          if (!acc[key]) {
            acc[key] = {
              id: short.id,
              original_video_path: key,
              created_at: short.created_at,
              shorts: []
            };
          }
          acc[key].shorts.push(short);
          return acc;
        }, {});

        // Convert grouped object to array and sort by creation date
        const sortedShorts = Object.values(groupedShorts).sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );

        console.log('Grouped shorts:', sortedShorts);
        setShorts(sortedShorts);
      } catch (err) {
        console.error('Error in fetchShorts:', err);
        toast.error('Failed to load your shorts');
      }
    };

    fetchShorts();
  }, [user]);

  // Click-away listener for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(null);
      }
    }
    if (showOptions !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptions]);

  const handleDelete = async (groupIdToDelete) => {
    try {
      // Find the original_video_path for the group being deleted
      const groupToDelete = shorts.find(group => group.id === groupIdToDelete);

      if (!groupToDelete) {
        toast.error('Group not found for deletion.');
        setShowDeleteConfirm(null);
        return;
      }

      const originalVideoPath = groupToDelete.original_video_path;

      // Delete all shorts with the same original_video_path for this user
      const { error } = await supabase
        .from('shorts')
        .delete()
        .eq('original_video_path', originalVideoPath)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting shorts:', error);
        toast.error('Failed to delete shorts');
        return;
      }

      // Update the state to remove the entire group
      setShorts(prev => prev.filter(group => group.id !== groupIdToDelete));
      setShowDeleteConfirm(null);
      toast.success('Shorts deleted successfully');
    } catch (err) {
      console.error('Error in handleDelete:', err);
      toast.error('Failed to delete shorts');
    }
  };

  // Download all shorts with a small delay between each to ensure all are triggered
  const handleDownloadAll = async (shorts) => {
    setShowOptions(null);
    for (let i = 0; i < shorts.length; i++) {
      const short = shorts[i];
      const link = document.createElement('a');
      link.href = short.url;
      link.download = `short_${i + 1}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Add a small delay to ensure browser processes each download
      await new Promise(res => setTimeout(res, 300));
    }
    // Wait a bit after last download to ensure all are triggered
    setTimeout(() => {
      toast.success('All shorts downloaded!');
    }, 5000);
  };

  const isMobile = screenWidth < 768;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: isDarkMode ? '#18181b' : '#f6f7fb', fontFamily: 'Montserrat, Inter, Segoe UI, Arial, sans-serif' }}>
      <Sidebar isMobile={isMobile} isDarkMode={isDarkMode} activePage="my-shorts" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar userEmail={user?.email} />
        <div style={{ flex: 1, padding: isMobile ? '16px' : '24px' }}>
          <div style={{ 
            maxWidth: 1100, 
            margin: '0 auto', 
            background: isDarkMode ? 'rgba(36, 39, 48, 0.95)' : '#fff', 
            borderRadius: 16,
            boxShadow: isDarkMode ? '0 8px 32px rgba(30,41,59,0.25)' : '0 8px 32px rgba(96,165,250,0.10)',
            padding: '24px 20px',
          }}>
            <h1 style={{ 
              fontSize: 20, 
              fontWeight: 800, 
              marginBottom: 16, 
              color: isDarkMode ? '#fff' : '#1e40af',
              letterSpacing: 0.2,
            }}>
              My Shorts
            </h1>
            {shorts.length === 0 ? (
              <div style={{ 
                color: isDarkMode ? '#bbb' : '#666', 
                fontSize: 13, 
                textAlign: 'center', 
                marginTop: 32,
                padding: '16px',
                background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderRadius: 8,
                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
              }}>
                You haven't generated any shorts yet.
              </div>
            ) : (
              <MyShortsList
                myShorts={shorts}
                isDarkMode={isDarkMode}
                showOptions={showOptions}
                setShowOptions={setShowOptions}
                showDeleteConfirm={showDeleteConfirm}
                setShowDeleteConfirm={setShowDeleteConfirm}
                handleDownloadAll={handleDownloadAll}
                handleDelete={handleDelete}
                user={user}
              />
            )}
          </div>
        </div>
      </div>
      {showDeleteConfirm && (
        <DeleteConfirmModal
          isDarkMode={isDarkMode}
          onCancel={() => setShowDeleteConfirm(null)}
          onDelete={() => handleDelete(showDeleteConfirm)}
        />
      )}
    </div>
  );
};

export default MyShortsPage; 