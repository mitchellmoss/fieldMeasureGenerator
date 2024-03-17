import React, { useState, useEffect } from 'react';
import { Modal, GridList, GridListTile, GridListTileBar, IconButton } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Grid } from '@material-ui/core';
import Loader from './components/Loader';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
} from '@material-ui/core';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@material-ui/icons';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Compressor from 'compressorjs';
import heic2any from 'heic2any';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
  buttonContainer: {
    marginTop: theme.spacing(2),
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  dimensionContainer: {
    display: 'flex',
    alignItems: 'center',
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  dimensionContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    '& > *': {
      margin: theme.spacing(1),
      flex: '1 0 auto',
      minWidth: '80px',
    },

    modal: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContent: {
      backgroundColor: theme.palette.background.paper,
      border: '2px solid #000',
      boxShadow: theme.shadows[5],
      padding: theme.spacing(2, 4, 3),
      maxWidth: '80%',
      maxHeight: '80%',
      overflowY: 'auto',
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    icon: {
      color: 'rgba(255, 255, 255, 0.54)',
    },
    modalButtons: {
      marginTop: theme.spacing(2),
      textAlign: 'right',
    },
    fallbackImage: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: 200,
      backgroundColor: '#f0f0f0',
      color: '#888',
    },

  },
}));






const useCurrentDateTime = () => {
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formattedDateTime = now.toLocaleString();
      setCurrentDateTime(formattedDateTime);
    };

    updateDateTime(); // Initial update

    const interval = setInterval(updateDateTime, 1000); // Update every second

    return () => {
      clearInterval(interval); // Clean up the interval on component unmount
    };
  }, []);

  return currentDateTime;
};

const FlooringInstallationNotes = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [db, setDb] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const classes = useStyles();
  const [jobAddress, setJobAddress] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [area, setArea] = useState('');
  const [subArea, setSubArea] = useState('');
  const [subSubArea, setSubSubArea] = useState('');
  const [dimensions, setDimensions] = useState([
    { lengthFeet: '', lengthInches: '', widthFeet: '', widthInches: '' },
  ]);
  const [totalSqFeet, setTotalSqFeet] = useState(0);
  const [notes, setNotes] = useState('');
  const [flooringList, setFlooringList] = useState([]);
  const [editIndex, setEditIndex] = useState(-1);

  const initializeIndexedDB = () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('FlooringInstallationNotesDB', 1);
  
      request.onerror = () => {
        console.error('Failed to open IndexedDB database');
        reject(request.error);
      };
  
      request.onsuccess = () => {
        const db = request.result;
        console.log('IndexedDB database opened successfully');
        setDb(db);
        resolve(db);
      };
  
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const objectStore = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('imageData', 'imageData', { unique: false });
        console.log('IndexedDB database created successfully');
      };
    });
  };

  const currentDateTime = useCurrentDateTime();
  useEffect(() => {
    setDateTime(currentDateTime);
  }, [currentDateTime]);

  useEffect(() => {
    initializeIndexedDB()
      .then((db) => {
        // Retrieve uploaded images from IndexedDB
        const transaction = db.transaction(['images'], 'readonly');
        const objectStore = transaction.objectStore('images');
        const request = objectStore.getAll();
  
        request.onsuccess = () => {
          const savedImages = request.result;
          const parsedImages = savedImages.map((image) => {
            if (typeof image.imageData === 'string' && image.imageData.startsWith('data:image')) {
              return image.imageData;
            }
            console.warn('Invalid image data:', image.imageData);
            return null;
          }).filter(Boolean);
          setUploadedImages(parsedImages);
        };
  
        request.onerror = (event) => {
          console.error('Error retrieving images from IndexedDB:', event.target.error);
        };
      })
      .catch((error) => {
        console.error('Error initializing IndexedDB:', error);
      });
  }, []);

  useEffect(() => {
    const savedJobAddress = localStorage.getItem('jobAddress');
    const savedDateTime = localStorage.getItem('dateTime');
    const savedFlooringList = JSON.parse(localStorage.getItem('flooringList'));
  
    if (savedJobAddress) setJobAddress(savedJobAddress);
    if (savedDateTime) setDateTime(savedDateTime);
    if (savedFlooringList) {
      const parsedFlooringList = savedFlooringList.map((item) => ({
        ...item,
        dimensions: item.dimensions.map((dimension) => ({
          lengthFeet: dimension.lengthFeet,
          lengthInches: dimension.lengthInches,
          widthFeet: dimension.widthFeet,
          widthInches: dimension.widthInches,
        })),
      }));
      setFlooringList(parsedFlooringList);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 600);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleImageDelete = (index) => {
    const updatedImages = [...uploadedImages];
    updatedImages.splice(index, 1);
    setUploadedImages(updatedImages);
    saveImagesToIndexedDB(updatedImages); // Save updated images to IndexedDB
  };

  const handleEdit = (index) => {
    const item = flooringList[index];
    setEditIndex(index);
    setJobAddress(item.jobAddress);
    setDateTime(item.dateTime);
    setArea(item.area);
    setSubArea(item.subArea);
    setSubSubArea(item.subSubArea);
    setDimensions(item.dimensions);
    setTotalSqFeet(item.totalSqFeet);
    setNotes(item.notes);
  };

  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [openModal, setOpenModal] = useState(false);

  const MAX_UPLOADED_IMAGES = 10; // Set the maximum number of allowed images

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      const fileType = file.type;
      const isJPEG = fileType === 'image/jpeg';
      const isPNG = fileType === 'image/png';
      const isHEIC = fileType === 'image/heic';
  
      if (isJPEG || isPNG) {
        // Handle JPEG and PNG images
        new Compressor(file, {
          quality: 0.8,
          maxWidth: 1000,
          maxHeight: 1000,
          success(result) {
            const reader = new FileReader();
            reader.onload = () => {
              const imageDataURL = reader.result;
              setSelectedImage(imageDataURL);
        
              if (uploadedImages.length >= MAX_UPLOADED_IMAGES) {
                const updatedImages = [...uploadedImages.slice(1), imageDataURL];
                setUploadedImages(updatedImages);
                saveImagesToIndexedDB(updatedImages); // Save images to IndexedDB
              } else {
                const updatedImages = [...uploadedImages, imageDataURL];
                setUploadedImages(updatedImages);
                saveImagesToIndexedDB(updatedImages); // Save images to IndexedDB
              }
            };
            reader.readAsDataURL(result);
          },
          error(err) {
            console.error('Image compression error:', err);
          },
        });
      } else if (isHEIC) {
        try {
          const blob = await fetch(URL.createObjectURL(file)).then((res) => res.blob());
          const convertedImage = await heic2any({
            blob,
            toType: 'image/jpeg',
            quality: 0.8,
          });
          const imageDataURL = URL.createObjectURL(convertedImage);
          setSelectedImage(imageDataURL);
  
          if (uploadedImages.length >= MAX_UPLOADED_IMAGES) {
            const updatedImages = [...uploadedImages.slice(1), imageDataURL];
            setUploadedImages(updatedImages);
            saveImagesToIndexedDB(updatedImages);
          } else {
            const updatedImages = [...uploadedImages, imageDataURL];
            setUploadedImages(updatedImages);
            saveImagesToIndexedDB(updatedImages);
          }
        } catch (error) {
          console.error('Error converting HEIC image:', error);
        }
      } else {
        console.error('Unsupported image format');
      }
      setIsLoading(false); // Set loading state to false after upload is complete
    }
  };

  const saveImagesToIndexedDB = (images) => {
    if (db) {
      const transaction = db.transaction(['images'], 'readwrite');
      const objectStore = transaction.objectStore('images');
  
      // Clear existing images
      objectStore.clear();
  
      // Add new images
      images.forEach((imageData) => {
        objectStore.add({ imageData });
      });
  
      transaction.oncomplete = () => {
        console.log('Images saved to IndexedDB');
      };
  
      transaction.onerror = (event) => {
        console.error('Error saving images to IndexedDB:', event.target.error);
      };
    }
  };

  const handleOpenModal = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  

  const addUpdateList = () => {
    const newItem = {
      jobAddress,
      dateTime,
      area,
      subArea,
      subSubArea,
      dimensions,
      totalSqFeet,
      notes,
    };

    if (editIndex === -1) {
      // Add new item
      const updatedList = [...flooringList, newItem];
      setFlooringList(updatedList);
      localStorage.setItem('flooringList', JSON.stringify(updatedList));
    } else {
      // Update existing item
      const updatedList = [...flooringList];
      updatedList[editIndex] = newItem;
      setFlooringList(updatedList);
      localStorage.setItem('flooringList', JSON.stringify(updatedList));
      setEditIndex(-1);
    }

    // Clear form fields
  setArea('');
  setSubArea('');
  setSubSubArea('');
  setDimensions([{ lengthFeet: '', lengthInches: '', widthFeet: '', widthInches: '' }]);
  setTotalSqFeet(0);
  setNotes('');
};

  const handleDelete = (index) => {
    const updatedList = [...flooringList];
    updatedList.splice(index, 1);
    setFlooringList(updatedList);
    localStorage.setItem('flooringList', JSON.stringify(updatedList));
  };

  const handleDimensionChange = (index, field, value) => {
    const updatedDimensions = [...dimensions];
    updatedDimensions[index][field] = value;
    setDimensions(updatedDimensions);
  };

  const addDimension = () => {
    setDimensions([
      ...dimensions,
      { lengthFeet: '', lengthInches: '', widthFeet: '', widthInches: '' },
    ]);
  };

  const removeDimension = (index) => {
    const updatedDimensions = [...dimensions];
    updatedDimensions.splice(index, 1);
    setDimensions(updatedDimensions);
  };

  const calculateTotalSF = () => {
    const totalSF = dimensions.reduce((total, dimension) => {
      const length = parseFloat(dimension.lengthFeet) + parseFloat(dimension.lengthInches) / 12;
      const width = parseFloat(dimension.widthFeet) + parseFloat(dimension.widthInches) / 12;
      return total + length * width;
    }, 0);
    setTotalSqFeet(totalSF.toFixed(2));
  };


  const generatePDF = async () => {
    const doc = new jsPDF();
  
    // Set purple color for the document
    doc.setTextColor(128, 0, 128);
    doc.setDrawColor(128, 0, 128);
    doc.setFillColor(230, 230, 250);
  
    // Add title
    doc.setFontSize(18);
    doc.text('Flooring Installation Notes', 14, 22);
  
    // Add job address
    doc.setFontSize(12);
    doc.text(`Job Address / Name: ${jobAddress}`, 14, 32);
  
    // Add date/time
    doc.text(`Date / Time: ${dateTime}`, 14, 38);
  
    // Add table with flooring installation list
    const tableData = flooringList.map((item) => [
      item.area,
      item.subArea,
      item.subSubArea,
      item.dimensions
        .map((dim) => `${dim.lengthFeet}' ${dim.lengthInches}" x ${dim.widthFeet}' ${dim.widthInches}"`)
        .join(', '),
      item.totalSqFeet,
      item.notes,
    ]);
  
    // Set table styles
    const tableConfig = {
      startY: 44,
      head: [['Area / Floor', 'Sub Area', 'Sub-Sub Area', 'Dimensions', 'Total SF', 'Notes']],
      body: tableData,
      headStyles: {
        fillColor: [128, 0, 128],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [230, 230, 250],
      },
    };
  
    // Generate the table
    doc.autoTable(tableConfig);
  
    //Add uploaded images as subsequent pages
  for (let i = 0; i < uploadedImages.length; i++) {
    const image = uploadedImages[i];
    let imageData = image;

    if (image.startsWith('data:image/heic')) {
      try {
        const blob = await fetch(image).then((res) => res.blob());
        const convertedImage = await heic2any({
          blob,
          toType: 'image/jpeg',
          quality: 0.8,
        });
        imageData = URL.createObjectURL(convertedImage);
      } catch (error) {
        console.error('Error converting HEIC image:', error);
        continue;
      }
    }

    doc.addPage();
    doc.addImage(imageData, 'JPEG', 10, 10, 190, 0, `image-${i}`);
  }

  // Generate the file name based on the job address
  const fileName = `flooring_installation_notes_${jobAddress.replace(/\s+/g, '_')}.pdf`;

  // Save the PDF with the generated file name
  doc.save(fileName);
};

  const addToList = () => {
    const newItem = {
      jobAddress,
      dateTime,
      area,
      subArea,
      subSubArea,
      dimensions: dimensions.map((dimension) => ({
        lengthFeet: dimension.lengthFeet,
        lengthInches: dimension.lengthInches,
        widthFeet: dimension.widthFeet,
        widthInches: dimension.widthInches,
      })),
      totalSqFeet,
      notes,
    };
  
    const updatedList = [...flooringList, newItem];
    setFlooringList(updatedList);
    localStorage.setItem('flooringList', JSON.stringify(updatedList));
  
    setArea('');
    setSubArea('');
    setSubSubArea('');
    setDimensions([{ lengthFeet: '', lengthInches: '', widthFeet: '', widthInches: '' }]);
    setTotalSqFeet(0);
    setNotes('');
  };

  

  const clearStorage = () => {
    const confirmClear = window.confirm('Are you sure you want to clear all data? This action cannot be undone.');
    
    if (confirmClear) {
      localStorage.removeItem('jobAddress');
      localStorage.removeItem('dateTime');
      localStorage.removeItem('flooringList');
      localStorage.removeItem('uploadedImages');
      setJobAddress('');
      setDateTime('');
      setFlooringList([]);
      if (db) {
        const transaction = db.transaction(['images'], 'readwrite');
        const objectStore = transaction.objectStore('images');
        objectStore.clear();
      }
    }
  };

  return (
    <div className={classes.root}>
      <Typography variant="h4" gutterBottom>
        Flooring Installation Notes
      </Typography>
  
      {isLoading ? (
        <Loader />
      ) : (
        <>
  
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Job Address / Name"
                value={jobAddress}
                onChange={(e) => {
                  setJobAddress(e.target.value);
                  localStorage.setItem('jobAddress', e.target.value);
                }}
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Date / Time"
                value={dateTime}
                onChange={(e) => {
                  setDateTime(e.target.value);
                  localStorage.setItem('dateTime', e.target.value);
                }}
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Area / Floor"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Sub Area"
                value={subArea}
                onChange={(e) => setSubArea(e.target.value)}
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Sub-Sub Area"
                value={subSubArea}
                onChange={(e) => setSubSubArea(e.target.value)}
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
  {dimensions.map((dimension, index) => (
    <div key={index} className={classes.dimensionContainer}>
      <TextField
        label="Length (ft)"
        value={dimension.lengthFeet}
        onChange={(e) => handleDimensionChange(index, 'lengthFeet', e.target.value)}
        margin="dense"
        variant="outlined"
        size="small"
      />
      <TextField
        label="Length (in)"
        value={dimension.lengthInches}
        onChange={(e) => handleDimensionChange(index, 'lengthInches', e.target.value)}
        margin="dense"
        variant="outlined"
        size="small"
      />
      <TextField
        label="Width (ft)"
        value={dimension.widthFeet}
        onChange={(e) => handleDimensionChange(index, 'widthFeet', e.target.value)}
        margin="dense"
        variant="outlined"
        size="small"
      />
      <TextField
        label="Width (in)"
        value={dimension.widthInches}
        onChange={(e) => handleDimensionChange(index, 'widthInches', e.target.value)}
        margin="dense"
        variant="outlined"
        size="small"
      />
      <IconButton onClick={() => removeDimension(index)}>
        <DeleteIcon />
      </IconButton>
    </div>
  ))}
  <Button variant="outlined" startIcon={<AddIcon />} onClick={addDimension}>
    Add Dimension
  </Button>
</Grid>
            <Grid item xs={12}>
              <TextField
                label="Total Square Feet (SF)"
                value={totalSqFeet}
                disabled
                fullWidth
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                minRows={4}
                fullWidth
                margin="dense"
              />
            </Grid>
            </Grid>
        <Grid container spacing={2} className={classes.buttonContainer}>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" onClick={calculateTotalSF} fullWidth>
              Calculate Total SF
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" onClick={addUpdateList} fullWidth>
              {editIndex === -1 ? 'Add to List' : 'Update Item'}
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" color="primary" onClick={generatePDF} fullWidth>
              Generate PDF
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" color="secondary" onClick={clearStorage} fullWidth>
              Clear All Data
            </Button>
          </Grid>
          <Grid item xs={12}>
            <input
               accept="image/jpeg, image/png, image/heic"
               className={classes.input}
               style={{ display: 'none' }}
               id="raised-button-file"
               multiple
               type="file"
               onChange={handleImageUpload}
            />
            <label htmlFor="raised-button-file">
              <Button variant="contained" component="span" fullWidth>
                Upload Image
              </Button>
            </label>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleOpenModal} fullWidth>
              Show Images
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>

    <Typography variant="h5" gutterBottom>
      Flooring Installation List
    </Typography>
    {flooringList.map((item, index) => (
      <Card key={index} className={classes.listItem}>
        <CardContent>
      <Typography variant="subtitle1" gutterBottom>
        <strong>Job Address / Name:</strong> {item.jobAddress}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        <strong>Date / Time:</strong> {item.dateTime}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        <strong>Area / Floor:</strong> {item.area}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        <strong>Sub Area:</strong> {item.subArea}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        <strong>Sub-Sub Area:</strong> {item.subSubArea}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        <strong>Dimensions (L x W):</strong>{' '}
        {item.dimensions.map((dimension) =>
          `${dimension.lengthFeet}' ${dimension.lengthInches}" x ${dimension.widthFeet}' ${dimension.widthInches}"`
        ).join(', ')}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        <strong>Total Square Feet (SF):</strong> {item.totalSqFeet}
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        <strong>Notes:</strong> {item.notes}
      </Typography>
      <div>
        <IconButton onClick={() => handleEdit(index)}>
          <EditIcon />
        </IconButton>
        <IconButton onClick={() => handleDelete(index)}>
          <DeleteIcon />
        </IconButton>
      </div>
      
        </CardContent>
      </Card>
    ))}
    
    <Modal
  className={classes.modal}
  open={openModal}
  onClose={handleCloseModal}
>
  <div className={classes.modalContent}>
    <Typography variant="h5" gutterBottom>
      Uploaded Images
    </Typography>
    <GridList cellHeight={200} cols={isMobileView ? 1 : 3} spacing={10}>
  {uploadedImages.map((image, index) => (
    <GridListTile key={index}>
      {image ? (
        <img src={image} alt={`Uploaded ${index}`} className={classes.image} />
      ) : (
        <div className={classes.fallbackImage}>Image not available</div>
      )}
      <GridListTileBar
        title={`Image ${index + 1}`}
        actionIcon={
          <IconButton
            className={classes.icon}
            onClick={() => handleImageDelete(index)}
          >
            <DeleteIcon />
          </IconButton>
        }
      />
    </GridListTile>
  ))}
</GridList>
    <div className={classes.modalButtons}>
      <Button variant="contained" color="primary" onClick={handleCloseModal}>
        Close
      </Button>
            </div>
          </div>
        </Modal>
      </>
    )}
  </div>
);
};

export default FlooringInstallationNotes;