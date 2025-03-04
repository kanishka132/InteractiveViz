document.addEventListener("DOMContentLoaded", function () {
  // Fetch clustering results from JSON file
  fetch("clustering_results.json")
      .then((response) => response.json())
      .then((clusteringData) => {
          // Process clustering data
          console.log(clusteringData); 
          // Call function to update document ID list based on clustering results
          updateDocumentList(clusteringData);

          // Load data from JSON file for D3.js visualization
          d3.json("mds_data1.json").then(function (data) {
              // Call function to create D3.js visualization with the fetched data
              createD3Visualization(data);
          });
      })
      .catch((error) =>
          console.error("Error fetching clustering results:", error)
      );
});

// Function to create D3.js visualization with the fetched data
function createD3Visualization(data) {
  // Set up SVG dimensions
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 600 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  // Append SVG container
  const svg = d3
      .select("#chart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const g = svg.append("g"); // Create a container group for nodes and labels

  // Define x and y scales
  const xScale = d3.scaleLinear().domain([-15, 23]).range([0, width]);
  const yScale = d3.scaleLinear().domain([-25, 15]).range([height, 0]);

  // Add circles for each data point
  svg
      .selectAll(".node")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("cx", (d) => xScale(d.MDS1))
      .attr("cy", (d) => yScale(d.MDS2))
      .attr("r", 3) // Radius of each node
      .style("fill", "blue")
      .attr("data-index", (d) => d.index) // Assign the index to the node
      .on("mouseover", handleNodeMouseOver)
      .on("mouseout", handleNodeMouseOut)
      .on("click", handleNodeClick);

  // Add x axis
  svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

  // Add y axis
  svg.append("g").call(d3.axisLeft(yScale));


}

// Function to handle mouseover event on nodes
function handleNodeMouseOver(d, i) {
  const fileName = this.getAttribute("data-index"); // Assuming the node data contains the document index
  console.log("Hi");
  highlightSelectedFile(fileName);
}

// Function to handle mouseout event on nodes
function handleNodeMouseOut(d, i) {
  const fileName = this.getAttribute("data-index"); // Assuming the node data contains the document index
  console.log("Hi");
  dehighlightSelectedFile(fileName);
} 

// Function to handle click event on nodes
function handleNodeClick() {
  const fileName = this.getAttribute("data-index"); // Retrieve the index from the node
  fetchFileContent(fileName);
  highlightSelectedFile(fileName);
}


// Function to update document ID list based on clustering results
function updateDocumentList(clusteringData) {
  const fileNamesList = document.getElementById("fileNames");
  // Remove existing document list items
  fileNamesList.innerHTML = "";

  // Loop through keys of clustering data (cluster names)
  Object.keys(clusteringData).forEach((clusterName, index) => {
    // Get cluster object
    const cluster = clusteringData[clusterName];
    // Create a block for each cluster
    const clusterBlock = document.createElement("div");
    clusterBlock.classList.add("clusterBlock");
    clusterBlock.setAttribute("draggable", true); // Make the cluster block draggable
    // Add cluster name as label
    const label = document.createElement("h3");
    label.textContent = clusterName;
    clusterBlock.appendChild(label);
    // Append block to document ID list
    fileNamesList.appendChild(clusterBlock);

    // Add drag and drop event listeners for reordering cluster blocks
    clusterBlock.addEventListener("dragstart", function (e) {
      draggedItem = this;
      e.dataTransfer.setData("text/plain", this.textContent);
    });

    clusterBlock.addEventListener("dragover", function (e) {
      e.preventDefault();
      const target = e.target;

      if (target.classList.contains("clusterBlock")) {
        const boundingBox = target.getBoundingClientRect();
        const isAbove = e.clientY < boundingBox.top + boundingBox.height / 2;
        fileNamesList.insertBefore(
          draggedItem,
          isAbove ? target : target.nextSibling
        );
      }
    });

    clusterBlock.addEventListener("dragend", function () {
      draggedItem = null;
    });

    // Loop through files in the cluster
    cluster.files.forEach((fileName) => {
      // Create list item for each file
      const listItem = document.createElement("li");
      listItem.textContent = fileName;

      // Add click event listener to fetch file content and highlight selected file
      listItem.addEventListener("click", function () {
        fetchFileContent(fileName);
        highlightSelectedFile(fileName);
      });

      // Add drag and drop event listeners for reordering file list
      listItem.draggable = true;

      listItem.addEventListener("dragstart", function (e) {
        draggedItem = this;
        e.dataTransfer.setData("text/plain", this.textContent);
      });

      listItem.addEventListener("dragover", function (e) {
        e.preventDefault();
        const target = e.target;

        if (target.nodeName === "LI") {
          const boundingBox = target.getBoundingClientRect();
          const isAbove = e.clientY < boundingBox.top + boundingBox.height / 2;
          fileNamesList.insertBefore(
            draggedItem,
            isAbove ? target : target.nextSibling
          );
        }
      });

      listItem.addEventListener("dragend", function () {
        draggedItem = null;
      });

      // Append list item to cluster block
      clusterBlock.appendChild(listItem);
    });
  });
}

let openedFiles = {}; // To store information about opened files
let draggedItem = null; // To keep track of the item being dragged

// This function open/close the file based on its current status
function fetchFileContent(fileName) {
  if (openedFiles[fileName]) {
    closeFileContent(fileName); //Function call to close the file
    openedFiles[fileName] = false;
  } else {
    fetch("dataset/" + fileName)
      .then((response) => response.text())
      .then((text) => {
        displayFileContent(text, fileName);
        openedFiles[fileName] = true;
      })
      .catch((error) => console.log("Error fetching file content: ", error));
  }
}

// Function definition to close the file
function closeFileContent(fileName) {
  const workspace = document.querySelector(".workspace");
  const fileTextArea = workspace.querySelector(
    `textarea[data-file-name="${fileName}"]`
  );
  if (fileTextArea) {
    workspace.removeChild(fileTextArea);
  }
  const fileContainer = workspace.querySelector(
    `div[data-file-name="${fileName}"]`
  );
  if (fileContainer) {
    workspace.removeChild(fileContainer);
  }
}

// Highlights latest file selection from the file list in blue
function highlightSelectedFile(fileName) {
  const fileItems = document.querySelectorAll("#fileNames li");
  fileItems.forEach((item) => {
    if (item.textContent === fileName) {
      item.style.color = "blue"; // Change the color to blue
    } else {
      item.style.color = "black"; // Reset the color of other items
    }
  });
}

// De-highlights the file by resetting the color
function dehighlightSelectedFile(fileName) {
  const fileItems = document.querySelectorAll("#fileNames li");
  fileItems.forEach((item) => {
    if (item.textContent === fileName) {
      item.style.color = "black"; // Reset the color of the specified file
    } else {
      item.style.color = "black"; // Reset the color of other items as well
    }
  });
}

function displayFileContent(content, fileName) {
  const workspace = document.querySelector(".workspace");
  // Create a container for each file content box
  const fileContainer = document.createElement("div");
  fileContainer.classList.add("fileContainer");
  fileContainer.setAttribute("data-file-name", fileName); // Set the container with the file name
  fileContainer.draggable = true; // Make the container draggable

  // Create a heading for the file name
  const fileHeading = document.createElement("h3");
  fileHeading.textContent = fileName;
  fileContainer.appendChild(fileHeading); // Add the heading to the container

  // Create the textarea for the file content
  const newTextArea = document.createElement("textarea");
  newTextArea.classList.add("fileTextArea");
  newTextArea.value = content;
  newTextArea.style.width = "100%"; // Make textarea take full width of the container
  newTextArea.style.height = "150px"; // Set a fixed height for the textarea
  newTextArea.style.border = "none"; // Remove border from textarea
  newTextArea.style.marginTop = "5px"; // Add some space between the heading and textarea

  fileContainer.appendChild(newTextArea); // Add the textarea to the container
  workspace.appendChild(fileContainer); // Add the container to the workspace

  // Drag and Drop Events for the container
  fileContainer.addEventListener("dragstart", function (e) {
    draggedItem = fileContainer; // Set the current container as the item being dragged
  });

  fileContainer.addEventListener("dragover", function (e) {
    e.preventDefault(); // Necessary to allow dropping
  });

  fileContainer.addEventListener("drop", function (e) {
    e.preventDefault();
    if (
      e.target.classList.contains("fileContainer") ||
      e.target.closest(".fileContainer")
    ) {
      // Find the closest fileContainer to where it was dropped
      const closestContainer = e.target.closest(".fileContainer");
      const positionToInsert = getPositionToInsert(
        workspace,
        closestContainer,
        e.clientY
      );
      if (positionToInsert === "before") {
        workspace.insertBefore(draggedItem, closestContainer);
      } else {
        workspace.insertBefore(draggedItem, closestContainer.nextSibling);
      }
    }
  });
}

// Determines the position to insert a dragged item relative to a container based on the mouse position.
function getPositionToInsert(workspace, container, mouseY) {
  const rect = container.getBoundingClientRect();
  const middleY = rect.top + rect.height / 2;
  return mouseY < middleY ? "before" : "after";
}

