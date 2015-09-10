// Get JSON data
treeJSON = d3.json("flare.json", function(error, treeData) {
  // Calculate total nodes, max label length
  var totalNodes = 0;
  var maxLabelLength = 0;
  // variables for drag/drop
  var selectedNode = null;
  var draggingNode = null;
  // // panning variables
  // var panSpeed = 2000;
  // var panBoundary = 20; // Within 20px from edges will pan when dragging.
  // Misc. variables
  var i = 0;
  var duration = 200;
  var root;

  // size of the diagram
  var viewerWidth = $(document).width();
  var viewerHeight = $(document).height();

  var tree = d3.layout.tree()
    .size([viewerHeight, viewerWidth]);

  // define a d3 diagonal projection for use by the node paths later on.
  var diagonal = d3.svg.diagonal()
    .projection(function(d) {
      return [d.y, d.x];
    });
  // A recursive helper function for performing some setup by walking through all nodes




  function visit(parent, visitFn, childrenFn) {
    if (!parent) return;

    visitFn(parent);

    var children = childrenFn(parent);
    if (children) {
      var count = children.length;
      for (var i = 0; i < count; i++) {
        visit(children[i], visitFn, childrenFn);
      }
    }
  }

  // Call visit function to establish maxLabelLength
  visit(treeData, function(d) {
    totalNodes++;
    maxLabelLength = Math.max(d.name.length, maxLabelLength);

  }, function(d) {
    return d.children && d.children.length > 0 ? d.children : null;
  });


  // sort the tree according to the node names

  function sortTree() {
    tree.sort(function(a, b) {
      return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
    });
  }
  // Sort the tree initially incase the JSON isn't in a sorted order.
  sortTree();

  // define the baseSvg, attaching a class for styling and the zoomListener
  var baseSvg = d3.select("#tree-container").append("svg")
    .attr("width", viewerWidth)
    .attr("height", viewerHeight)
    .attr("class", "overlay");


  // Toggle children function

  function toggleChildren(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else if (d._children) {
      d.children = d._children;
      d._children = null;
    }
    return d;
  }

  // Add path colors

  function addColorsToPath(d) {
    var parentSchema = [d];
    var linksSelected = [];
    // Remove the extra classes other than links
    svgGroup.selectAll("path.link").attr('class', 'link');
    // Get all the parents of the selected node
    function visitParent(node) {
      if (!node.parent)
        return;
      else {
        parentSchema.push(node.parent);
        visitParent(node.parent);
      }
    }
    visitParent(d);
    // Function to get all the paths whose source or target mathces the
    var links = tree.links(tree.nodes(parentSchema[parentSchema.length - 1]));
    links.forEach(function(link) {
      var sr = false;
      var tr = false;
      parentSchema.forEach(function(item) {
        if (link.source.id === item.id) {
          sr = true;
        }
        if (link.target.id === item.id) {
          tr = true;
        }
      });
      if (sr && tr) {
        linksSelected.push(link);
      }
    });
    nodePaths = svgGroup.selectAll("path.link")
      .data(linksSelected, function(d) {
        return d.target.id;
      }).attr('class', 'link active');
  }


  function setToPos(x, y) {
    d3.select('g').transition()
      .duration(duration)
      .attr("transform", "translate(" + x + "," + y + ")");
  }
  // Toggle children and add path color on click.

  function click(d) {
    if (d3.event.defaultPrevented) return; // click suppressed
    d = toggleChildren(d);
    update(d);
    addColorsToPath(d);
  }

  function update(source) {
    // Compute the new height, function counts total children of root node and sets tree height accordingly.
    // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
    // This makes the layout more consistent.
    var levelWidth = [1];
    var childCount = function(level, n) {

      if (n.children && n.children.length > 0) {
        if (levelWidth.length <= level + 1) levelWidth.push(0);

        levelWidth[level + 1] += n.children.length;
        n.children.forEach(function(d) {
          childCount(level + 1, d);
        });
      }
    };
    childCount(0, root);
    //Set height here
    var newHeight = d3.max(levelWidth) * 30; // 50 pixels per line
    tree = tree.size([newHeight, viewerWidth]);

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

    // Set widths between levels based on maxLabelLength.
    nodes.forEach(function(d) { // Set width here
      d.y = (d.depth * (maxLabelLength * 20)); //maxLabelLength * 10px
    });

    // Update the nodes…
    node = svgGroup.selectAll("g.node")
      .data(nodes, function(d) {
        return d.id || (d.id = ++i);
      });
    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) {
        console.log(source);
        return "translate(" + source.y0 + "," + source.x0 + ")";
      })
      .on('click', click);
    var leftOffsetImage;

    nodeEnter.append("circle")
      .attr('class', 'nodeCircle')
      .attr("r", 0)
      .style("fill", function(d) {
        return d._children ? "#999" : "#bbb";
      });

    nodeEnter.append("text")
      .attr("x", function(d) {
        return d.children || d._children ? -10 : 10;
      })
      .text(function(d) {
        return d.name;
      })
      .style("fill-opacity", 0)
      .attr("dy", ".35em")
      .attr("dx", "25px")
      .attr('class', 'nodeText')
      .attr("text-anchor", function(d) {
        return "start";
      });
    nodeEnter.append("image")
      .attr("xlink:href", function(d) {
        if (d.children) {
          return "minus.png";
        } else if (d._children) {
          return "plus.png";
        } else if (!d.children || !d._children) {
          return "#";
        } else {
          return;
        }
      }).attr("width", function(d) {
        if (d.children) {
          return "22px";
        } else if (d._children) {
          return "30px";
        } else if (!d.children || !d._children) {
          return "0";
        } else {
          return;
        }
      }).attr("height", function(d) {
        if (d.children) {
          return "20px";
        } else if (d._children) {
          return "16px";
        } else if (!d.children || !d._children) {
          return "0";
        } else {
          return;
        }
      }).attr("x", function(d) {
        var leftOffsetImage = this.parentNode.children[1].clientWidth + this.parentNode.children[1].offsetLeft;
        return leftOffsetImage + 'px';
      }).attr("y", function(d) {
        if (d.children) {
          return "-11px";
        } else if (d._children) {
          return "-9px";
        } else if (!d.children || !d._children) {
          return "0";
        } else {
          return;
        }
      });

    node.select('text')
      .attr("text-anchor", function(d) {
        return "start";
      })
      .text(function(d) {
        return d.name;
      })
      .attr("x", function(d) {
        return d.children || d._children ? -10 : 10;
      });
    node.select('image')
      .attr("x", function(d) {
        var leftOffsetImage = this.parentNode.children[1].clientWidth + this.parentNode.children[1].offsetLeft;
        if (d.children) {
          return (leftOffsetImage - 3) + 'px';
        } else if (d._children) {
          return (leftOffsetImage) + 'px';
        } else if (!d.children || !d._children) {
          return "0";
        } else {
          return;
        }

      }).attr("y", function(d) {
        if (d.children) {
          return "-11px";
        } else if (d._children) {
          return "-9px";
        } else if (!d.children || !d._children) {
          return "0";
        } else {
          return;
        }
      }).attr("xlink:href", function(d) {
        if (d.children) {
          return "minus.png";
        } else if (d._children) {
          return "plus.png";
        } else if (!d.children || !d._children) {
          return "#";
        } else {
          return;
        }
      });

    // Change the circle fill depending on whether it has children and is collapsed
    node.select("circle.nodeCircle")
      .attr("r", 10)
      .style("fill", function(d) {
        return d._children ? "#999" : "#bbb";
      });
    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function(d) {
        return "translate(" + d.y + "," + d.x + ")";
      });

    // Fade the text in
    nodeUpdate.select("text")
      .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
        return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

    nodeExit.select("circle")
      .attr("r", 0);

    nodeExit.select("text")
      .style("fill-opacity", 0);


    // Update the links…
    var link = svgGroup.selectAll("path.link")
      .data(links, function(d) {
        return d.target.id;
      });

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = {
          x: source.x0,
          y: source.y0
        };
        return diagonal({
          source: o,
          target: o
        });
      });
    // Transition links to their new position.
    link.transition()
      .duration(duration)
      .attr("d", function(d) {
        // Defining the extra offset variable
        var extraPathOffset;
        // Getting tje source node json;
        sourceNode = d.source;
        // getting the main graphic node for the given json object
        node = svgGroup.selectAll("g.node")
          .data(sourceNode, function(ds) {
            return ds.id;
          });

        var allElements = node[0]['parentNode'].children; // Accessing all the child elements of the container g node
        // Iterating all the nodes and paths
        for (i = 0; i < allElements.length - 1; i++) {
          if (allElements[i].nodeName === 'g') { // if the item is node
            console.log(allElements);
            if (allElements[i].textContent === d.source.name) { // check if the name of both the nodes are equal
              extraPathOffset = allElements[i].children[1].clientWidth + allElements[i].children[1].offsetLeft + allElements[i].children[2].width.animVal.value; // calculate the widths of the assets of the g node.
            }
          }
        }
        var sr = {
          x: d.source.x,
          y: d.source.y + extraPathOffset - 10 // Move the y coordinate by extra offset and the some adjustment of 10 px;
        };
        var des = {
          x: d.target.x,
          y: d.target.y
        };
        return diagonal({
          source: sr,
          target: des
        });
      });

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {
          x: source.x,
          y: source.y
        };
        return diagonal({
          source: o,
          target: o
        });
      })
      .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  // Append a group which holds all nodes and which the zoom Listener can act upon.
  var svgGroup = baseSvg.append("g");
  // Define the root
  root = treeData;
  root.x0 = viewerHeight / 2;
  root.y0 = 0;

  // Layout the tree initially and center on the root node.
  update(root);
  setToPos(40, 100);
});
