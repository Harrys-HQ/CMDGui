const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

async function createFile(filePath) {
  try {
    await fs.promises.writeFile(filePath, '');
    return { success: true };
  } catch (error) {
    console.error('Error creating file:', error);
    return { success: false, error: error.message };
  }
}

async function createDirectory(dirPath) {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error('Error creating directory:', error);
    return { success: false, error: error.message };
  }
}

async function renameItem(oldPath, newPath) {
  try {
    await fs.promises.rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    console.error('Error renaming item:', error);
    return { success: false, error: error.message };
  }
}

async function deleteItem(itemPath) {
  try {
    await shell.trashItem(itemPath);
    return { success: true };
  } catch (error) {
    console.error('Error deleting item:', error);
    return { success: false, error: error.message };
  }
}

function openInExplorer(itemPath) {
  try {
    shell.showItemInFolder(itemPath);
    return { success: true };
  } catch (error) {
    console.error('Error opening in explorer:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createFile,
  createDirectory,
  renameItem,
  deleteItem,
  openInExplorer,
};
