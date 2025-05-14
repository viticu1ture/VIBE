import time
import datetime

from javascript import require

from math import sqrt, atan2, sin, cos

Vec3  = require('vec3').Vec3

#
# Math helper functions
#

def add_vec3(v1, v2):
    return Vec3(v1.x+v2.x,v1.y+v2.y,v1.z+v2.z)

def sub_vec3(v1, v2):
    return Vec3(v1.x-v2.x,v1.y-v2.y,v1.z-v2.z)

def inv_vec3(v1):
    return Vec3(-v1.x,-v1.y,-v1.z)


def len_vec3(v):
    return sqrt(v.x*v.x+v.y*v.y+v.z*v.z)

# Minecraft is a right-handed coordinate system
#
#    0--------X------->
#    |      North
#    Z   West   East
#    |      South
#    V

def rotate_left(v):
    return Vec3(v.z,0,-v.x)

def rotate_right(v):
    return Vec3(-v.z,0,v.x)

def direction_str(v):
    if abs(v.x) > abs(v.z):
        if v.x > 0:
            return "East"
        else:
            return "West"
    else:
        if v.z > 0:
            return "South"
        else:
            return "North"

def str_direction(d_str):
    d = d_str.lower()[0]
    if   d == 'n':
        return Vec3(0,0,-1)
    elif d == 's':
        return Vec3(0,0, 1)
    elif d == 'e':
        return Vec3(1,0, 0)
    elif d == 'w':
        return Vec3(-1,0,0)
    else:
        return None


def distance_vec3(v1, v2):
    if not v1:
        print("*** error: v1 in distanceVec3() is null.")
        return None
    if not v2:
        print("*** error: v2 in distanceVec3() is null.")
        return None
    dv = sub_vec3(v1, v2)
    return len_vec3(dv)

def walk_time(v1, v2):
    if not v1:
        print("*** error: v1 in walkTime() is null.")
        return None
    if not v2:
        print("*** error: v2 in walkTime() is null.")
        return None
    d = distance_vec3(v1, v2)
    return d/4.3+0.1

def get_view_vector (pitch, yaw):
    csPitch = cos(pitch)
    snPitch = sin(pitch)
    csYaw = cos(yaw)
    snYaw = sin(yaw)
    #print(f'ViewVector {pitch} / {yaw} -> {-snYaw * csPitch},{snPitch},{-csYaw * csPitch}' )
    return Vec3(-snYaw * csPitch, snPitch, -csYaw * csPitch)

# Generator that steps through the outer part of a rectangle of w x h centered around 0,0

def rectangle_border(w, h):

    if w == 0 and h == 0:
        yield 0,0
    elif h == 0:
        for dx in range(-w,w+1):
            yield dx,0
    elif w == 0:
        for dy in range(-h,h+1):
            yield 0,dy
    else:
        for dx in range(-w,w+1):
            yield dx,h
        for dy in range(h-1,-h-1,-1):
            yield w,dy
        for dx in range(w-1,-w-1,-1):
            yield dx,-h
        for dy in range(-h+1,h):
            yield -w,dy

def direction_to_vec(block):
    m = block.metadata
    if m == 1: #North  001 vs 010
        return Vec3(0,0,-1)
    elif m == 3: # South 011 vs 011
        return Vec3(0,0,1)
    elif m == 5: # West  101 vs 100
        return Vec3(-1,0,0)
    elif m == 7: # East  111 vs 101
        return Vec3(1,0,0)
    else:
        return False
